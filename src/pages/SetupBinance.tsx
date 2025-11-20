import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { SubscriptionTimer } from "@/components/SubscriptionTimer";
import nottifyLogo from "@/assets/nottify-logo.png";


const SetupBinance = () => {
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountData.name || !accountData.apiKey || !accountData.apiSecret) {
      toast.error("Fill in all fields");
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
                <Label htmlFor="name">Nome da Conta</Label>
                <Input
                  id="name"
                  placeholder="Minha Conta Principal"
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
                  placeholder="Sua API Key da Binance"
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
                  placeholder="Seu API Secret da Binance"
                  value={accountData.apiSecret}
                  onChange={(e) =>
                    setAccountData({ ...accountData, apiSecret: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conectar Binance
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupBinance;
