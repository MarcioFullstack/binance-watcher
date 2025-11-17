import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BalanceCards } from "@/components/dashboard/BalanceCards";
import { PnLCards } from "@/components/dashboard/PnLCards";
import { AlertsConfig } from "@/components/dashboard/AlertsConfig";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscriptionRealtime } from "@/hooks/useSubscriptionRealtime";
import { useAlertsRealtime } from "@/hooks/useAlertsRealtime";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Enable realtime subscription notifications
  useSubscriptionRealtime(user?.id);
  
  // Enable realtime alerts notifications
  useAlertsRealtime(user?.id, isAdmin);

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

      // Verificar se é admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roles);

      // Verificar assinatura apenas na primeira carga
      if (loading) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!subscription || subscription.status !== 'active') {
          navigate("/payment");
          return;
        }

        // Verificar se existe conta Binance configurada
        const { data: accounts } = await supabase
          .from('binance_accounts')
          .select('id, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!accounts || accounts.length === 0) {
          navigate("/setup-binance");
          return;
        }
      }

      setHasAccount(true);
    } catch (error) {
      console.error("Error checking user:", error);
      if (loading) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso");
      navigate("/login");
    } catch (error: any) {
      toast.error("Error logging out");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <DashboardHeader onLogout={handleLogout} isAdmin={isAdmin} userId={user?.id} />
        
        {hasAccount ? (
          <>
            <BalanceCards />
            <PnLCards />
            <AlertsConfig />
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
