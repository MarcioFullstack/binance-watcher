import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SubscriptionTimer } from "@/components/SubscriptionTimer";
import { Loader2, Trash2 } from "lucide-react";
import { useSubscriptionRealtime } from "@/hooks/useSubscriptionRealtime";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

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

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-binance-accounts');
      
      if (error) {
        console.error('Error deleting Binance data:', error);
        toast.error("Erro ao excluir dados da Binance");
        return;
      }

      toast.success("Todos os dados da Binance foram excluídos com sucesso");
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erro ao excluir dados");
    } finally {
      setIsDeleting(false);
    }
  };

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

      <Card className="p-8">
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
            <p className="text-muted-foreground">
              Dashboard limpo e pronto para nova configuração.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4 pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="lg"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir Todas as Chaves de API
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá excluir permanentemente:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Todas as contas Binance configuradas</li>
                      <li>Histórico de P&L diário</li>
                      <li>Configurações de alertas de P&L</li>
                      <li>Configurações de gestão de risco</li>
                    </ul>
                    <p className="mt-3 font-semibold">Esta ação não pode ser desfeita.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllData}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <p className="text-xs text-muted-foreground max-w-md">
              Exclua todas as chaves de API e dados relacionados à Binance. 
              Você pode configurar uma nova conta a qualquer momento.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
