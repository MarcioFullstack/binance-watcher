import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Check, X, ArrowLeft, Shield, TrendingUp, Users, DollarSign, Activity, Ticket, Copy, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

interface AdminStats {
  payments: {
    total: number;
    confirmed: number;
    pending: number;
    rejected: number;
    totalReceived: string;
    conversionRate: string;
    byDay: Array<{ date: string; count: number; amount: number }>;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    subscriptionsByStatus: Record<string, number>;
  };
  topUsers: Array<{ userId: string; amount: number }>;
}

interface Voucher {
  id: string;
  code: string;
  days: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherDays, setVoucherDays] = useState("30");
  const [creatingVoucher, setCreatingVoucher] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState<"all" | "used" | "available">("all");
  const [voucherSearch, setVoucherSearch] = useState("");
  const [invalidatingVoucher, setInvalidatingVoucher] = useState<string | null>(null);
  const [voucherCount, setVoucherCount] = useState(1);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const navigate = useNavigate();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
      loadStats();
      loadVouchers();
      loadAuditLogs();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-stats");

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setStatsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLogsLoading(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setAuditLogsLoading(false);
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
      loadStats();
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
      loadStats();
    } catch (error: any) {
      toast.error(error.message || "Erro ao rejeitar pagamento");
    } finally {
      setActionLoading(null);
    }
  };

  const loadVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      console.error("Error loading vouchers:", error);
      toast.error("Erro ao carregar vouchers");
    }
  };

  const handleCreateVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error("Digite um código para o voucher");
      return;
    }

    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(voucherCode)) {
      toast.error("O código deve estar no formato XXXX-XXXX-XXXX-XXXX");
      return;
    }

    const days = parseInt(voucherDays);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error("Dias deve ser um número entre 1 e 365");
      return;
    }

    setCreatingVoucher(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-voucher", {
        body: { code: voucherCode, days },
      });

      if (error) throw error;

      toast.success("Voucher criado com sucesso!");
      setVoucherCode("");
      setVoucherDays("30");
      loadVouchers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar voucher");
    } finally {
      setCreatingVoucher(false);
    }
  };

  const handleCopyVoucher = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado!");
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  const handleInvalidateVoucher = async (voucherId: string) => {
    if (!confirm("Tem certeza que deseja invalidar este voucher? Esta ação não pode ser desfeita.")) {
      return;
    }

    setInvalidatingVoucher(voucherId);
    try {
      const { error } = await supabase.functions.invoke("invalidate-voucher", {
        body: { voucherId },
      });

      if (error) throw error;

      toast.success("Voucher invalidado com sucesso!");
      loadVouchers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao invalidar voucher");
    } finally {
      setInvalidatingVoucher(null);
    }
  };

  const generateMultipleVouchers = async () => {
    if (voucherCount < 1 || voucherCount > 50) {
      toast.error("Quantidade deve ser entre 1 e 50");
      return;
    }

    const days = parseInt(voucherDays);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error("Dias deve ser um número entre 1 e 365");
      return;
    }

    setCreatingVoucher(true);
    try {
      const promises = [];
      for (let i = 0; i < voucherCount; i++) {
        const code = generateVoucherCode();
        promises.push(
          supabase.functions.invoke("create-voucher", {
            body: { code, days },
          })
        );
      }

      await Promise.all(promises);
      toast.success(`${voucherCount} vouchers criados com sucesso!`);
      setVoucherCount(1);
      loadVouchers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar vouchers");
    } finally {
      setCreatingVoucher(false);
    }
  };

  const generateVoucherCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const parts = [];
    for (let i = 0; i < 4; i++) {
      let part = "";
      for (let j = 0; j < 4; j++) {
        part += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      parts.push(part);
    }
    return parts.join("-");
  };

  const exportVouchersToCSV = () => {
    const filtered = filterVouchers();
    
    // CSV Header
    const headers = ['Código', 'Dias de Validade', 'Status', 'Usado Por', 'Usado Em', 'Criado Em'];
    
    // CSV Rows
    const rows = filtered.map(voucher => [
      voucher.code,
      voucher.days.toString(),
      voucher.is_used ? 'Usado' : 'Disponível',
      voucher.used_by || '-',
      voucher.used_at ? new Date(voucher.used_at).toLocaleString('pt-BR') : '-',
      new Date(voucher.created_at).toLocaleString('pt-BR')
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vouchers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${filtered.length} vouchers exportados com sucesso!`);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE_VOUCHER: 'Criou Voucher',
      INVALIDATE_VOUCHER: 'Invalidou Voucher',
      APPROVE_PAYMENT: 'Aprovou Pagamento',
      REJECT_PAYMENT: 'Rejeitou Pagamento',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE_VOUCHER: 'bg-blue-500/10 text-blue-500',
      INVALIDATE_VOUCHER: 'bg-orange-500/10 text-orange-500',
      APPROVE_PAYMENT: 'bg-green-500/10 text-green-500',
      REJECT_PAYMENT: 'bg-red-500/10 text-red-500',
    };
    return colors[action] || 'bg-gray-500/10 text-gray-500';
  };

  const filterAuditLogs = () => {
    if (auditFilter === 'all') return auditLogs;
    return auditLogs.filter(log => log.action === auditFilter);
  };

  const filterVouchers = () => {
    let filtered = vouchers;

    // Filtrar por status
    if (voucherFilter === "used") {
      filtered = filtered.filter((v) => v.is_used);
    } else if (voucherFilter === "available") {
      filtered = filtered.filter((v) => !v.is_used);
    }

    // Filtrar por busca
    if (voucherSearch.trim()) {
      filtered = filtered.filter((v) =>
        v.code.toLowerCase().includes(voucherSearch.toLowerCase())
      );
    }

    return filtered;
  };

  const voucherStats = {
    total: vouchers.length,
    used: vouchers.filter((v) => v.is_used).length,
    available: vouchers.filter((v) => !v.is_used).length,
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

        {/* Estatísticas */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <>
            {/* Cards de Métricas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.payments.totalReceived}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.payments.confirmed} pagamentos confirmados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.payments.conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.payments.confirmed} de {stats.payments.total} pagamentos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users.active}</div>
                  <p className="text-xs text-muted-foreground">
                    de {stats.users.total} usuários totais
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.payments.pending}</div>
                  <p className="text-xs text-muted-foreground">
                    aguardando aprovação
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pagamentos por Dia</CardTitle>
                  <CardDescription>Últimos 30 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.payments.byDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" name="Quantidade" />
                      <Line type="monotone" dataKey="amount" stroke="#82ca9d" name="Valor ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usuários por Status</CardTitle>
                  <CardDescription>Ativos vs Inativos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Ativos', value: stats.users.active },
                          { name: 'Inativos', value: stats.users.inactive },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status de Pagamentos</CardTitle>
                  <CardDescription>Distribuição por status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Confirmados', value: stats.payments.confirmed },
                      { name: 'Pendentes', value: stats.payments.pending },
                      { name: 'Rejeitados', value: stats.payments.rejected },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" name="Quantidade" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Usuários</CardTitle>
                  <CardDescription>Por valor total de pagamentos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topUsers.map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="font-mono text-xs">{user.userId.slice(0, 8)}...</span>
                        </div>
                        <span className="font-bold">${user.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

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

        {/* Vouchers Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <CardTitle>Gerenciar Vouchers</CardTitle>
            </div>
            <CardDescription>
              Criar, visualizar e invalidar vouchers para ativar assinaturas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estatísticas de Vouchers */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{voucherStats.total}</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Disponíveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{voucherStats.available}</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Usados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">{voucherStats.used}</div>
                </CardContent>
              </Card>
            </div>

            {/* Formulário de Criação */}
            <div className="grid gap-4 rounded-lg border p-4 bg-card/50">
              <h3 className="font-semibold">Criar Novos Vouchers</h3>
              <Tabs defaultValue="single" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single">Único</TabsTrigger>
                  <TabsTrigger value="multiple">Múltiplos</TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="voucherCode">Código do Voucher</Label>
                      <Input
                        id="voucherCode"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        maxLength={19}
                        disabled={creatingVoucher}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use apenas letras e números (formato: XXXX-XXXX-XXXX-XXXX)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voucherDays">Dias de Validade</Label>
                      <Input
                        id="voucherDays"
                        type="number"
                        min="1"
                        max="365"
                        value={voucherDays}
                        onChange={(e) => setVoucherDays(e.target.value)}
                        disabled={creatingVoucher}
                      />
                      <p className="text-xs text-muted-foreground">
                        Entre 1 e 365 dias
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateVoucher}
                    disabled={creatingVoucher}
                    className="w-full sm:w-auto"
                  >
                    {creatingVoucher ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Ticket className="mr-2 h-4 w-4" />
                        Criar Voucher
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="multiple" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="voucherCount">Quantidade</Label>
                      <Input
                        id="voucherCount"
                        type="number"
                        min="1"
                        max="50"
                        value={voucherCount}
                        onChange={(e) => setVoucherCount(parseInt(e.target.value) || 1)}
                        disabled={creatingVoucher}
                      />
                      <p className="text-xs text-muted-foreground">
                        Entre 1 e 50 vouchers
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voucherDaysMultiple">Dias de Validade</Label>
                      <Input
                        id="voucherDaysMultiple"
                        type="number"
                        min="1"
                        max="365"
                        value={voucherDays}
                        onChange={(e) => setVoucherDays(e.target.value)}
                        disabled={creatingVoucher}
                      />
                      <p className="text-xs text-muted-foreground">
                        Entre 1 e 365 dias para todos
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={generateMultipleVouchers}
                    disabled={creatingVoucher}
                    className="w-full sm:w-auto"
                  >
                    {creatingVoucher ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Ticket className="mr-2 h-4 w-4" />
                        Gerar {voucherCount} Voucher{voucherCount > 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Os códigos serão gerados automaticamente
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por código..."
                  value={voucherSearch}
                  onChange={(e) => setVoucherSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={exportVouchersToCSV}
                  variant="outline"
                  size="default"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
                <Tabs value={voucherFilter} onValueChange={(v) => setVoucherFilter(v as any)} className="w-auto">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="available">Disponíveis</TabsTrigger>
                    <TabsTrigger value="used">Usados</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Lista de Vouchers */}
            <div>
              <h3 className="font-semibold mb-4">
                Vouchers ({filterVouchers().length} de {vouchers.length})
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usado Por</TableHead>
                      <TableHead>Usado Em</TableHead>
                      <TableHead>Criado Em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterVouchers().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Nenhum voucher encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterVouchers().map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell className="font-mono font-bold">
                            {voucher.code}
                          </TableCell>
                          <TableCell>{voucher.days} dias</TableCell>
                          <TableCell>
                            {voucher.is_used ? (
                              <Badge variant="secondary">Usado</Badge>
                            ) : (
                              <Badge className="bg-success">Disponível</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {voucher.used_by ? voucher.used_by.slice(0, 8) + "..." : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {voucher.used_at ? new Date(voucher.used_at).toLocaleString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(voucher.created_at).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyVoucher(voucher.code)}
                                title="Copiar código"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {!voucher.is_used && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInvalidateVoucher(voucher.id)}
                                  disabled={invalidatingVoucher === voucher.id}
                                  title="Invalidar voucher"
                                  className="text-destructive hover:text-destructive"
                                >
                                  {invalidatingVoucher === voucher.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Logs de Auditoria</CardTitle>
            </div>
            <CardDescription>
              Histórico completo de ações administrativas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros */}
            <div className="flex gap-2">
              <Tabs value={auditFilter} onValueChange={setAuditFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="CREATE_VOUCHER">Vouchers Criados</TabsTrigger>
                  <TabsTrigger value="INVALIDATE_VOUCHER">Vouchers Invalidados</TabsTrigger>
                  <TabsTrigger value="APPROVE_PAYMENT">Pagamentos Aprovados</TabsTrigger>
                  <TabsTrigger value="REJECT_PAYMENT">Pagamentos Rejeitados</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tabela de Logs */}
            {auditLogsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterAuditLogs().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum log encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterAuditLogs().map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge className={getActionColor(log.action)}>
                              {getActionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium capitalize">{log.entity_type}</span>
                              {log.entity_id && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {log.entity_id.slice(0, 8)}...
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-mono max-w-xs overflow-hidden text-ellipsis">
                              {log.details && (
                                <div className="space-y-1">
                                  {log.details.code && <div>Código: {log.details.code}</div>}
                                  {log.details.days && <div>Dias: {log.details.days}</div>}
                                  {log.details.amount && <div>Valor: {log.details.amount} {log.details.currency}</div>}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.ip_address || '-'}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
