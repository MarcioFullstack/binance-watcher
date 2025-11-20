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
  const { lossStatus } = useAdvancedLossAlarm(currentBalance, initialBalance, !!binanceData);

  // Enable realtime subscription notifications
  useSubscriptionRealtime(user?.id);

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
      toast.success("Logout realizado com sucesso");
      navigate("/login");
    } catch (error: any) {
      toast.error("Erro ao fazer logout");
    }
  };

  // Show setup prompt if no Binance account or keys error
  if (!binanceData || hasBinanceKeysError) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar isAdmin={isAdmin} />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card">
              <SidebarTrigger />
              <SubscriptionTimer 
                userId={user?.id} 
                onExpired={() => {
                  toast.error("Sua assinatura expirou");
                  navigate("/payment");
                }} 
              />
            </header>
            
            <main className="flex-1 p-6">
              <Card className="p-8 border-border">
                {hasBinanceKeysError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Suas chaves da API da Binance são inválidas ou expiraram. 
                      Configure novamente para acessar o dashboard.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-center space-y-4">
                  <Settings className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h2 className="text-2xl font-bold">Configure sua Conta Binance</h2>
                  <p className="text-muted-foreground">
                    Conecte sua conta Binance para começar a visualizar seus dados de trading.
                  </p>
                  <Button onClick={() => navigate("/setup-binance")} size="lg" className="mt-4">
                    Configurar Binance
                  </Button>
                </div>
              </Card>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card">
            <SidebarTrigger />
            <SubscriptionTimer 
              userId={user?.id} 
              onExpired={() => {
                toast.error("Sua assinatura expirou");
                navigate("/payment");
              }} 
            />
          </header>
          
          <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto">
            {lossStatus.isInLoss && (
              <div className="space-y-3">
                <LossRiskIndicator
                  currentLossPercent={lossStatus.currentLossPercent}
                  currentLossAmount={lossStatus.currentLossAmount}
                  triggeredLevel={lossStatus.triggeredLevel}
                  isInLoss={lossStatus.isInLoss}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/alert-history">
                    <Button variant="outline" className="w-full">
                      Ver Histórico
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="secondary" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurar Alertas
                    </Button>
                  </Link>
                </div>
              </div>
            )}
            <BalanceCards />
            <PnLDashboard />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
