import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { SubscriptionTimer } from "@/components/SubscriptionTimer";
import nottifyLogo from "@/assets/nottify-logo.png";


const SetupBinance = () => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [accountData, setAccountData] = useState({
    name: "",
    apiKey: "",
    apiSecret: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);

      // Check if has active subscription
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      console.log("Subscription check:", { subscription, subError });

      // Verify subscription exists and is not expired
      if (!subscription) {
        console.log("No active subscription found");
        toast.error("You need an active subscription to access this page");
        navigate("/payment");
        return;
      }

      // Check if subscription is expired
      const expiresAt = new Date(subscription.expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        console.log("Subscription expired at:", expiresAt);
        toast.error("Your subscription has expired");
        navigate("/payment");
        return;
      }
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/login");
    } finally {
      setChecking(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accountData.apiKey || !accountData.apiSecret) {
      toast.error("Fill in API Key and API Secret to test");
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("test-binance-connection", {
        body: {
          api_key: accountData.apiKey,
          api_secret: accountData.apiSecret,
        },
      });

      if (error) throw error;

      if (data.success) {
        setTestResult({ success: true, message: data.message });
        toast.success("Connection successful! ✓");
      } else {
        setTestResult({ success: false, message: data.error });
        toast.error(data.error || "Connection failed");
      }
    } catch (error: any) {
      setTestResult({ success: false, message: "Failed to test connection" });
      toast.error("Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountData.name || !accountData.apiKey || !accountData.apiSecret) {
      toast.error("Fill in all fields");
      return;
    }

    if (testResult && !testResult.success) {
      toast.error("Please test and fix your connection first");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("save-binance-account", {
        body: {
          account_name: accountData.name,
          api_key: accountData.apiKey,
          api_secret: accountData.apiSecret,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }

      if (error) throw error;

      toast.success("Binance account configured successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Error configuring account");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-4xl space-y-6">
        <OnboardingProgress currentStep={3} />
        <div className="flex items-center justify-center gap-3">
          <img src={nottifyLogo} alt="NOTTIFY" className="w-12 h-12" />
          <h1 className="text-3xl font-bold text-foreground">NOTTIFY</h1>
        </div>

        {/* Subscription Timer */}
        <SubscriptionTimer userId={user?.id} onExpired={() => navigate("/payment")} />

        <Card>
          <CardHeader>
            <CardTitle>Configure your Binance API</CardTitle>
            <CardDescription>
              Connect your Binance account to start monitoring your operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="My Main Account"
                  value={accountData.name}
                  onChange={(e) =>
                    setAccountData({ ...accountData, name: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  placeholder="Your Binance API Key"
                  value={accountData.apiKey}
                  onChange={(e) =>
                    setAccountData({ ...accountData, apiKey: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  placeholder="Your Binance API Secret"
                  value={accountData.apiSecret}
                  onChange={(e) =>
                    setAccountData({ ...accountData, apiSecret: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-md ${
                  testResult.success ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}

              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleTestConnection}
                disabled={testing || loading}
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>

              <Button type="submit" className="w-full" disabled={loading || testing}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect Binance
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupBinance;
