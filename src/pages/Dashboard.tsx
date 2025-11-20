import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BalanceCards } from "@/components/dashboard/BalanceCards";
import { PnLDashboard } from "@/components/dashboard/PnLDashboard";
import { AlertsConfig } from "@/components/dashboard/AlertsConfig";
import { PnLAlertsConfig } from "@/components/dashboard/PnLAlertsConfig";
import { RiskAlertsInfo } from "@/components/dashboard/RiskAlertsInfo";
import { BinanceKeysAlert } from "@/components/dashboard/BinanceKeysAlert";
import { BinanceSetupPrompt } from "@/components/dashboard/BinanceSetupPrompt";
import { SubscriptionTimer } from "@/components/SubscriptionTimer";
import { Loader2 } from "lucide-react";
import { useSubscriptionRealtime } from "@/hooks/useSubscriptionRealtime";
import { useAlertsRealtime } from "@/hooks/useAlertsRealtime";
import { useDailyPnLSync } from "@/hooks/useDailyPnLSync";
import { useBinanceData } from "@/hooks/useBinanceData";
import { useBinanceAccountStatus } from "@/hooks/useBinanceAccountStatus";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Check Binance account status
  const { data: accountStatus, isLoading: accountLoading } = useBinanceAccountStatus(user?.id);
  
  console.log('Dashboard accountStatus:', accountStatus);
  
  // Only try to fetch Binance data if we have a user and account
  const shouldFetchBinanceData = !!user?.id && accountStatus?.hasAccount;
  
  // Check for Binance keys validity (only when we should fetch data)
  const { error: binanceError, data: binanceData } = useBinanceData();
  const hasBinanceKeysError = binanceError instanceof Error && 
    binanceError.message === 'BINANCE_KEYS_INVALID';
  
  console.log('Dashboard Binance check:', { 
    shouldFetch: shouldFetchBinanceData, 
    hasData: !!binanceData, 
    hasError: !!binanceError,
    errorMessage: binanceError?.message 
  });

  // Enable realtime subscription notifications
  useSubscriptionRealtime(user?.id);
  
  // Enable realtime alerts notifications
  useAlertsRealtime(user?.id, isAdmin);

  // Sync daily PnL data (only if account exists and keys are valid)
  const { isSyncing, syncProgress, manualSync } = useDailyPnLSync(
    accountStatus?.hasAccount && !hasBinanceKeysError ? user?.id : undefined
  );

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);

      // Check if is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roles);

      // Check subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      console.log("Dashboard subscription check:", { subscription, subError });

      if (!subscription) {
        console.log("No active subscription found");
        toast.error("You need an active subscription to access the dashboard");
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

      setLoading(false);
    } catch (error) {
      console.error("Error checking user:", error);
      navigate("/login");
    }
  };

  if (loading || accountLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout successful");
      navigate("/login");
    } catch (error: any) {
      toast.error("Error logging out");
    }
  };

  // Show setup prompt if no Binance account is configured
  if (!accountStatus?.hasAccount) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-6 space-y-6">
          <DashboardHeader isAdmin={isAdmin} onLogout={handleLogout} />
          
          <SubscriptionTimer 
            userId={user?.id} 
            onExpired={() => {
              toast.error("Sua assinatura expirou");
              navigate("/payment");
            }} 
          />
          
          <BinanceSetupPrompt />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <DashboardHeader isAdmin={isAdmin} onLogout={handleLogout} />
      
      <SubscriptionTimer 
        userId={user?.id} 
        onExpired={() => {
          toast.error("Sua assinatura expirou");
          navigate("/payment");
        }} 
      />
      
      {hasBinanceKeysError && <BinanceKeysAlert />}
      
      <BalanceCards />
      <PnLDashboard />
      <RiskAlertsInfo />
      <AlertsConfig />
      <PnLAlertsConfig />
    </div>
  );
};

export default Dashboard;
