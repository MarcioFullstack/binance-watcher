import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SubscriptionTimer } from "@/components/SubscriptionTimer";
import { Loader2, Settings } from "lucide-react";
import { useSubscriptionRealtime } from "@/hooks/useSubscriptionRealtime";
import { useBinanceData } from "@/hooks/useBinanceData";
import { useAdvancedLossAlarm } from "@/hooks/useAdvancedLossAlarm";
import { LossRiskIndicator } from "@/components/dashboard/LossRiskIndicator";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PnLDashboard } from "@/components/dashboard/PnLDashboard";
import { BalanceCards } from "@/components/dashboard/BalanceCards";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AlarmStopButton } from "@/components/AlarmStopButton";
import { AlarmBanner } from "@/components/AlarmBanner";
import { TestAlarmButton } from "@/components/TestAlarmButton";
import { useAlertSounds } from "@/hooks/useAlertSounds";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Check Binance data
  const { data: binanceData, error: binanceError } = useBinanceData();
  const hasBinanceKeysError = binanceError instanceof Error && 
    binanceError.message === 'BINANCE_KEYS_INVALID';
  
  // Monitor loss alarm with advanced system
  const currentBalance = binanceData ? parseFloat(binanceData.balance.total) : 0;
  const initialBalance = binanceData ? parseFloat(binanceData.balance.initial) : 0;
  const { lossStatus, stopAlarm } = useAdvancedLossAlarm(currentBalance, initialBalance, !!binanceData);

  // Enable realtime subscription notifications
  useSubscriptionRealtime(user?.id);

  // Alert sounds hook
  const { activeAlarm, stopAlarm: stopAlarmSound } = useAlertSounds(user?.id);

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

  if (loading) {
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


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Alarm Banner */}
        <AlarmBanner
          isActive={!!activeAlarm}
          type={activeAlarm?.type}
          onStop={stopAlarmSound}
        />
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold text-foreground hidden sm:block">Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <TestAlarmButton />
              <SubscriptionTimer 
                userId={user?.id} 
                onExpired={() => {
                  toast.error("Your subscription has expired");
                  navigate("/payment");
                }}
              />
            </div>
          </header>
          
          <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto relative">
            {/* Binance Setup Alert */}
            {(!binanceData || hasBinanceKeysError) && (
              <Alert variant={hasBinanceKeysError ? "destructive" : "default"} className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    {hasBinanceKeysError 
                      ? "Your Binance API keys are invalid or expired."
                      : "Connect your Binance account to view your trading data."}
                  </span>
                  <Button 
                    size="sm" 
                    variant={hasBinanceKeysError ? "destructive" : "default"}
                    onClick={() => navigate("/setup-binance")}
                  >
                    {hasBinanceKeysError ? "Reconfigure" : "Setup Now"}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Loss Risk Indicator */}
            {binanceData && lossStatus.isInLoss && (
              <div className="space-y-3">
                <LossRiskIndicator
                  currentLossPercent={lossStatus.currentLossPercent}
                  currentLossAmount={lossStatus.currentLossAmount}
                  triggeredLevel={lossStatus.triggeredLevel}
                  isInLoss={lossStatus.isInLoss}
                  alarmActive={!!activeAlarm && activeAlarm.type === 'loss'}
                  onStopAlarm={stopAlarmSound}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/alert-history">
                    <Button variant="outline" className="w-full">
                      View History
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="secondary" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Configure Alerts
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Balance Cards */}
            {binanceData ? (
              <BalanceCards />
            ) : (
              <Card className="p-8 border-dashed">
                <div className="text-center space-y-4">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Awaiting Setup</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your Binance account to view your balance and real-time trading data.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* PnL Dashboard */}
            {binanceData ? (
              <PnLDashboard />
            ) : (
              <Card className="p-8 border-dashed">
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">P&L Dashboard</h3>
                    <p className="text-sm text-muted-foreground">
                      Your profit and loss charts will appear here after connecting your account.
                    </p>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Alarm Stop Button */}
            <AlarmStopButton
              isActive={!!activeAlarm}
              type={activeAlarm?.type}
              onStop={stopAlarmSound}
            />

            {/* Floating Action Button */}
            <Link to="/settings">
              <Button
                size="lg"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40"
                title="Configure Loss Alerts"
              >
                <Settings className="h-6 w-6" />
              </Button>
            </Link>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
