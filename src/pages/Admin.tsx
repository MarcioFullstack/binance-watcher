import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Check, X, ArrowLeft, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Payment {
  id: string;
  user_id: string;
  wallet_address: string;
  expected_amount: number;
  currency: string;
  status: string;
  transaction_hash: string | null;
  confirmed_amount: number | null;
  confirmed_at: string | null;
  created_at: string;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Verificar se é admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roles) {
        toast.error("Acesso negado: apenas administradores");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      loadPayments();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error loading payments:", error);
      toast.error("Erro ao carregar pagamentos");
    }
  };

  const handleApprove = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      const { error } = await supabase.functions.invoke("approve-payment", {
        body: { payment_id: paymentId, action: "approve" },
      });

      if (error) throw error;

      toast.success("Pagamento aprovado e assinatura ativada!");
      loadPayments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao aprovar pagamento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      const { error } = await supabase.functions.invoke("approve-payment", {
        body: { payment_id: paymentId, action: "reject" },
      });

      if (error) throw error;

      toast.success("Pagamento rejeitado");
      loadPayments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao rejeitar pagamento");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "outline", label: "Pendente" },
      confirmed: { variant: "default", label: "Confirmado" },
      rejected: { variant: "destructive", label: "Rejeitado" },
      insufficient: { variant: "secondary", label: "Insuficiente" },
    };

    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filterPayments = (status: string) => {
    if (status === "all") return payments;
    return payments.filter((p) => p.status === status);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Gerenciar pagamentos e assinaturas</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>

        {pendingCount > 0 && (
          <Alert className="bg-amber-500/10 border-amber-500/20">
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              🔔 {pendingCount} pagamento{pendingCount > 1 ? "s" : ""} pendente{pendingCount > 1 ? "s" : ""} aguardando revisão
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos em Criptomoedas</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os pagamentos do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  Todos ({payments.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pendentes ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="confirmed">
                  Confirmados ({payments.filter((p) => p.status === "confirmed").length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejeitados ({payments.filter((p) => p.status === "rejected").length})
                </TabsTrigger>
              </TabsList>

              {["all", "pending", "confirmed", "rejected"].map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Valor Esperado</TableHead>
                          <TableHead>Valor Confirmado</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Hash</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterPayments(tab).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Nenhum pagamento encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filterPayments(tab).map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-mono text-xs">
                                {new Date(payment.created_at).toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {payment.user_id.slice(0, 8)}...
                              </TableCell>
                              <TableCell>
                                ${payment.expected_amount} {payment.currency}
                              </TableCell>
                              <TableCell>
                                {payment.confirmed_amount
                                  ? `$${payment.confirmed_amount}`
                                  : "-"}
                              </TableCell>
                              <TableCell>{getStatusBadge(payment.status)}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {payment.transaction_hash
                                  ? payment.transaction_hash.slice(0, 10) + "..."
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {payment.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleApprove(payment.id)}
                                      disabled={actionLoading === payment.id}
                                    >
                                      {actionLoading === payment.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleReject(payment.id)}
                                      disabled={actionLoading === payment.id}
                                    >
                                      {actionLoading === payment.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <X className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
