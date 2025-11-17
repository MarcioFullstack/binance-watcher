import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAlertsRealtime } from "@/hooks/useAlertsRealtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Check, X, ArrowLeft, Shield, TrendingUp, Users, DollarSign, Activity, Ticket, Copy, Download, Calendar, Bell, AlertTriangle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

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

interface AlertConfig {
  id: string;
  alert_type: 'vouchers_per_day' | 'payment_rejection_rate' | 'high_payment_volume';
  threshold: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Alert {
  id: string;
  alert_config_id: string;
  triggered_at: string;
  details: any;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface AlertConfigHistory {
  id: string;
  user_id: string;
  alert_type: string;
  field_changed: string;
  old_value: string | null;
  new_value: string;
  changed_at: string;
  changed_by: string;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
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
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<"week" | "month" | "3months" | "custom">("week");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState<string | null>(null);
  const [resolvedAlertsFilter, setResolvedAlertsFilter] = useState<string>("all");
  const [resolvedDateRange, setResolvedDateRange] = useState<"week" | "month" | "3months" | "all">("month");
  const [resolvedByUserId, setResolvedByUserId] = useState<string>("all");
  const [configHistory, setConfigHistory] = useState<AlertConfigHistory[]>([]);
  const [configHistoryLoading, setConfigHistoryLoading] = useState(false);
  const [historyDateRange, setHistoryDateRange] = useState<"week" | "month" | "3months" | "all">("week");
  const navigate = useNavigate();
  
  // Enable realtime alerts notifications for admins
  useAlertsRealtime(userId, isAdmin);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    checkAdminAccess();
    loadAlerts();
    loadAlertConfigs();
    loadConfigHistory();
  }, []);

  // Real-time subscription for alerts
  useEffect(() => {
    if (!isAdmin) return;

    console.log('Setting up realtime subscription for alerts...');

    const channel = supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        async (payload) => {
          console.log('New alert received:', payload);
          
          const newAlert = payload.new as Alert;
          
          // Add to alerts list
          setAlerts(prev => [newAlert, ...prev]);

          // Find the config for this alert
          const config = alertConfigs.find(c => c.id === newAlert.alert_config_id);
          
          // Show toast notification
          toast.error(
            `🚨 ${getAlertTypeLabel(config?.alert_type || '')}`,
            {
              description: newAlert.details?.message || 'Novo alerta disparado',
              duration: 10000,
              action: {
                label: 'Ver Detalhes',
                onClick: () => {
                  document.getElementById('active-alerts')?.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }
          );

          // Play notification sound (optional)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKvo8bViFgU7k9n0yHosBSh+zPLZjzsIGmm98OScTgwOUKbh8bllHAY7k9n0yHosBSh+zPLZjzsIG');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Audio play failed:', e));
          } catch (e) {
            console.log('Could not play notification sound:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('Alert updated:', payload);
          
          const updatedAlert = payload.new as Alert;
          
          // Update in alerts list
          setAlerts(prev => 
            prev.map(alert => 
              alert.id === updatedAlert.id ? updatedAlert : alert
            )
          );

          // Show toast if resolved
          if (updatedAlert.is_resolved && !payload.old.is_resolved) {
            toast.success('Alerta resolvido com sucesso');
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to alerts realtime updates');
        }
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [isAdmin, alertConfigs]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      
      setUserId(user.id);

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

      // Carregar perfis de usuários únicos
      const uniqueUserIds = [...new Set(data?.map(log => log.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", uniqueUserIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach(profile => {
        profileMap[profile.id] = profile.email;
      });
      setUserProfiles(profileMap);
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

  const loadAlertConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_configs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAlertConfigs(data || []);
    } catch (error: any) {
      console.error('Error loading alert configs:', error);
      toast.error('Erro ao carregar configurações de alertas');
    }
  };

  const loadAlerts = async () => {
    setAlertsLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error loading alerts:', error);
      toast.error('Erro ao carregar alertas');
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadConfigHistory = async () => {
    setConfigHistoryLoading(true);
    try {
      let query = supabase
        .from('alert_config_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100);

      // Aplicar filtro de data
      if (historyDateRange !== 'all') {
        const days = historyDateRange === 'week' ? 7 : historyDateRange === 'month' ? 30 : 90;
        const startDate = subDays(new Date(), days);
        query = query.gte('changed_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setConfigHistory(data || []);
    } catch (error: any) {
      console.error('Error loading config history:', error);
      toast.error('Erro ao carregar histórico de configurações');
    } finally {
      setConfigHistoryLoading(false);
    }
  };

  // Recarregar histórico quando o filtro de data mudar
  useEffect(() => {
    if (isAdmin) {
      loadConfigHistory();
    }
  }, [historyDateRange, isAdmin]);

  // Calcular métricas de alertas
  const getAlertMetrics = () => {
    if (!configHistory.length) {
      return {
        disableRate: 0,
        enableRate: 0,
        totalChanges: 0,
        thresholdChanges: 0,
        statusChanges: 0,
        disabledCount: 0,
        enabledCount: 0,
        trendData: [],
        topUsers: [],
      };
    }

    const statusChanges = configHistory.filter(h => h.field_changed === 'enabled');
    const thresholdChanges = configHistory.filter(h => h.field_changed === 'threshold');
    
    const disabledCount = statusChanges.filter(h => h.new_value === 'false').length;
    const enabledCount = statusChanges.filter(h => h.new_value === 'true').length;
    
    const totalStatusChanges = statusChanges.length;
    const disableRate = totalStatusChanges > 0 ? (disabledCount / totalStatusChanges) * 100 : 0;
    const enableRate = totalStatusChanges > 0 ? (enabledCount / totalStatusChanges) * 100 : 0;

    // Agrupar por data para gráfico de tendência
    const changesByDate: Record<string, { date: string; disabled: number; enabled: number; threshold: number }> = {};
    
    configHistory.forEach(history => {
      const date = format(new Date(history.changed_at), 'dd/MM');
      if (!changesByDate[date]) {
        changesByDate[date] = { date, disabled: 0, enabled: 0, threshold: 0 };
      }
      
      if (history.field_changed === 'enabled') {
        if (history.new_value === 'false') {
          changesByDate[date].disabled++;
        } else {
          changesByDate[date].enabled++;
        }
      } else {
        changesByDate[date].threshold++;
      }
    });

    const trendData = Object.values(changesByDate).reverse().slice(-14); // Últimos 14 dias

    // Top usuários que mais alteraram configurações
    const userChanges: Record<string, number> = {};
    configHistory.forEach(history => {
      userChanges[history.user_id] = (userChanges[history.user_id] || 0) + 1;
    });

    const topUsers = Object.entries(userChanges)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      disableRate: Math.round(disableRate),
      enableRate: Math.round(enableRate),
      totalChanges: configHistory.length,
      thresholdChanges: thresholdChanges.length,
      statusChanges: statusChanges.length,
      disabledCount,
      enabledCount,
      trendData,
      topUsers,
    };
  };

  const alertMetrics = getAlertMetrics();

  const updateAlertConfig = async (id: string, updates: Partial<AlertConfig>) => {
    setUpdatingConfig(id);
    try {
      const { error } = await supabase
        .from('alert_configs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Configuração atualizada com sucesso');
      loadAlertConfigs();
    } catch (error: any) {
      console.error('Error updating alert config:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setUpdatingConfig(null);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', alertId);

      if (error) throw error;
      
      toast.success('Alerta marcado como resolvido');
      loadAlerts();
    } catch (error: any) {
      console.error('Error resolving alert:', error);
      toast.error('Erro ao resolver alerta');
    }
  };

  const triggerAlertCheck = async () => {
    try {
      toast.info('Verificando alertas...');
      
      const { data, error } = await supabase.functions.invoke('check-alerts');

      if (error) throw error;
      
      toast.success(data.message || 'Verificação de alertas concluída');
      loadAlerts();
    } catch (error: any) {
      console.error('Error triggering alert check:', error);
      toast.error('Erro ao verificar alertas');
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vouchers_per_day: 'Vouchers por Dia',
      payment_rejection_rate: 'Taxa de Rejeição de Pagamentos',
      high_payment_volume: 'Alto Volume de Pagamentos'
    };
    return labels[type] || type;
  };

  const getResolvedAlerts = () => {
    let filtered = alerts.filter(a => a.is_resolved);

    // Filter by alert type
    if (resolvedAlertsFilter !== "all") {
      const config = alertConfigs.find(c => c.alert_type === resolvedAlertsFilter);
      if (config) {
        filtered = filtered.filter(a => a.alert_config_id === config.id);
      }
    }

    // Filter by date range
    if (resolvedDateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (resolvedDateRange) {
        case "week":
          startDate = subDays(now, 7);
          break;
        case "month":
          startDate = subMonths(now, 1);
          break;
        case "3months":
          startDate = subMonths(now, 3);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(a => new Date(a.resolved_at || a.triggered_at) >= startDate);
    }

    // Filter by resolved by user
    if (resolvedByUserId !== "all") {
      filtered = filtered.filter(a => a.resolved_by === resolvedByUserId);
    }

    return filtered;
  };

  const getResolutionMetrics = () => {
    const resolved = getResolvedAlerts();
    
    if (resolved.length === 0) {
      return {
        totalResolved: 0,
        averageResolutionTime: 0,
        fastestResolution: 0,
        slowestResolution: 0
      };
    }

    const resolutionTimes = resolved
      .filter(a => a.resolved_at)
      .map(a => {
        const triggered = new Date(a.triggered_at).getTime();
        const resolved = new Date(a.resolved_at!).getTime();
        return resolved - triggered;
      });

    const totalResolved = resolved.length;
    const averageResolutionTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    const fastestResolution = Math.min(...resolutionTimes);
    const slowestResolution = Math.max(...resolutionTimes);

    return {
      totalResolved,
      averageResolutionTime,
      fastestResolution,
      slowestResolution
    };
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getUniqueResolvers = () => {
    const resolvers = new Set(alerts.filter(a => a.resolved_by).map(a => a.resolved_by));
    return Array.from(resolvers);
  };

  // Métricas de Auditoria
  const getAuditMetrics = () => {
    // Determinar o período de filtro
    const now = new Date();
    let startDate: Date;
    let endDate = now;
    let daysInRange = 7;

    switch (dateRange) {
      case "week":
        startDate = subDays(now, 7);
        daysInRange = 7;
        break;
      case "month":
        startDate = subMonths(now, 1);
        daysInRange = 30;
        break;
      case "3months":
        startDate = subMonths(now, 3);
        daysInRange = 90;
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = startOfDay(customStartDate);
          endDate = endOfDay(customEndDate);
          daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          startDate = subDays(now, 7);
          daysInRange = 7;
        }
        break;
      default:
        startDate = subDays(now, 7);
    }

    // Filtrar logs pelo período
    const filteredLogs = auditLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= startDate && logDate <= endDate;
    });

    // Gerar array de datas para o período
    const dateArray = Array.from({ length: Math.min(daysInRange, 30) }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i * Math.ceil(daysInRange / 30));
      return date.toISOString().split('T')[0];
    });

    const actionsByDay = dateArray.map(date => {
      const count = filteredLogs.filter(log => 
        log.created_at.split('T')[0] === date
      ).length;
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        count
      };
    });

    // Ações por tipo
    const actionCounts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const actionsByType = Object.entries(actionCounts).map(([action, count]) => ({
      name: getActionLabel(action),
      value: count,
      action
    }));

    // Top usuários administrativos
    const userActionCounts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      userActionCounts[log.user_id] = (userActionCounts[log.user_id] || 0) + 1;
    });

    const topUsers = Object.entries(userActionCounts)
      .map(([userId, count]) => ({
        userId,
        email: userProfiles[userId] || userId.slice(0, 8) + '...',
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calcular ações de hoje
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const actionsToday = filteredLogs.filter(log => 
      new Date(log.created_at) >= todayStart
    ).length;

    return {
      actionsByDay,
      actionsByType,
      topUsers,
      totalActions: filteredLogs.length,
      actionsToday,
      uniqueUsers: new Set(filteredLogs.map(log => log.user_id)).size,
      avgPerDay: Math.round(filteredLogs.length / Math.max(daysInRange, 1))
    };
  };

  const auditMetrics = getAuditMetrics();

  const getPeriodLabel = () => {
    switch (dateRange) {
      case "week":
        return "Última Semana";
      case "month":
        return "Último Mês";
      case "3months":
        return "Últimos 3 Meses";
      case "custom":
        if (customStartDate && customEndDate) {
          return `${format(customStartDate, "dd/MM/yy")} - ${format(customEndDate, "dd/MM/yy")}`;
        }
        return "Período Customizado";
      default:
        return "Última Semana";
    }
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

        {/* Audit Metrics Dashboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Métricas de Administração</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {/* Filtro de Período Rápido */}
                <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                  <TabsList>
                    <TabsTrigger value="week">Semana</TabsTrigger>
                    <TabsTrigger value="month">Mês</TabsTrigger>
                    <TabsTrigger value="3months">3 Meses</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {/* Date Range Picker para Custom */}
                {dateRange === "custom" && (
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Calendar className="h-4 w-4" />
                          {customStartDate ? format(customStartDate, "dd/MM/yy") : "Início"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customStartDate}
                          onSelect={setCustomStartDate}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <span className="text-muted-foreground">até</span>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Calendar className="h-4 w-4" />
                          {customEndDate ? format(customEndDate, "dd/MM/yy") : "Fim"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          disabled={(date) => 
                            date > new Date() || 
                            (customStartDate ? date < customStartDate : false)
                          }
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
            <CardDescription>
              Dashboard com estatísticas e análises de ações administrativas - {getPeriodLabel()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estatísticas Resumidas */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditMetrics.totalActions}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {auditMetrics.actionsToday} hoje
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditMetrics.uniqueUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Administradores únicos
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Média Diária</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {auditMetrics.avgPerDay}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    No período selecionado
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Gráfico de Ações ao Longo do Tempo */}
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-base">Ações ao Longo do Tempo</CardTitle>
                  <CardDescription>{getPeriodLabel()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={auditMetrics.actionsByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Ações"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Distribuição por Tipo */}
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
                  <CardDescription>Total de ações por categoria</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={auditMetrics.actionsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {auditMetrics.actionsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Usuários Administrativos */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Top Administradores</CardTitle>
                <CardDescription>Usuários mais ativos no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditMetrics.topUsers.map((user, index) => (
                    <div key={user.userId} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{user.email}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {user.userId.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{user.count}</div>
                        <p className="text-xs text-muted-foreground">ações</p>
                      </div>
                    </div>
                  ))}
                  {auditMetrics.topUsers.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum dado disponível
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Alert Configuration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>Configurações de Alertas</CardTitle>
              </div>
              <Button onClick={triggerAlertCheck} variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Verificar Agora
              </Button>
            </div>
            <CardDescription>
              Configure limites para receber alertas automáticos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alertConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{getAlertTypeLabel(config.alert_type)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {config.alert_type === 'vouchers_per_day' && 'Alerta quando mais de X vouchers forem criados por dia'}
                      {config.alert_type === 'payment_rejection_rate' && 'Alerta quando a taxa de rejeição ultrapassar X%'}
                      {config.alert_type === 'high_payment_volume' && 'Alerta quando mais de X pagamentos forem registrados por dia'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`threshold-${config.id}`}>Limite:</Label>
                      <Input
                        id={`threshold-${config.id}`}
                        type="number"
                        value={config.threshold}
                        onChange={(e) => updateAlertConfig(config.id, { threshold: parseFloat(e.target.value) })}
                        disabled={updatingConfig === config.id}
                        className="w-24"
                      />
                      {config.alert_type === 'payment_rejection_rate' && <span>%</span>}
                    </div>
                    <Button
                      variant={config.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateAlertConfig(config.id, { enabled: !config.enabled })}
                      disabled={updatingConfig === config.id}
                    >
                      {updatingConfig === config.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : config.enabled ? (
                        'Ativo'
                      ) : (
                        'Inativo'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts Card */}
        <Card id="active-alerts">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <CardTitle>Alertas Ativos</CardTitle>
                  {alerts.filter(a => !a.is_resolved).length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {alerts.filter(a => !a.is_resolved).length}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Alertas disparados que requerem atenção • Atualizações em tempo real
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Conectado</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : alerts.filter(a => !a.is_resolved).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum alerta ativo no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.filter(a => !a.is_resolved).map((alert) => (
                  <Alert key={alert.id} variant="destructive" className="relative">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium mb-1">
                          {getAlertTypeLabel(alertConfigs.find(c => c.id === alert.alert_config_id)?.alert_type || '')}
                        </div>
                        <div className="text-sm">
                          {alert.details?.message}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(alert.triggered_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                        className="ml-4"
                      >
                        Resolver
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolved Alerts History Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <CardTitle>Histórico de Alertas Resolvidos</CardTitle>
            </div>
            <CardDescription>
              Análise completa de alertas resolvidos com métricas de desempenho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resolution Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Resolvido</CardDescription>
                  <CardTitle className="text-2xl">
                    {getResolutionMetrics().totalResolved}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Tempo Médio</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatDuration(getResolutionMetrics().averageResolutionTime)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Mais Rápido</CardDescription>
                  <CardTitle className="text-2xl text-green-500">
                    {formatDuration(getResolutionMetrics().fastestResolution)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Mais Lento</CardDescription>
                  <CardTitle className="text-2xl text-orange-500">
                    {formatDuration(getResolutionMetrics().slowestResolution)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Alert Type Filter */}
                <div className="space-y-2">
                  <Label>Tipo de Alerta</Label>
                  <Tabs value={resolvedAlertsFilter} onValueChange={setResolvedAlertsFilter}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="all">Todos</TabsTrigger>
                      <TabsTrigger value="vouchers_per_day">Vouchers</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Tabs value={resolvedAlertsFilter} onValueChange={setResolvedAlertsFilter}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="payment_rejection_rate">Rejeições</TabsTrigger>
                      <TabsTrigger value="high_payment_volume">Volume</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Tabs value={resolvedDateRange} onValueChange={(v) => setResolvedDateRange(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="week">Semana</TabsTrigger>
                      <TabsTrigger value="month">Mês</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Tabs value={resolvedDateRange} onValueChange={(v) => setResolvedDateRange(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="3months">3 Meses</TabsTrigger>
                      <TabsTrigger value="all">Todos</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Resolved By Filter */}
                <div className="space-y-2">
                  <Label>Resolvido Por</Label>
                  <Tabs value={resolvedByUserId} onValueChange={setResolvedByUserId}>
                    <TabsList className="grid w-full grid-cols-1">
                      <TabsTrigger value="all">Todos Usuários</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {getUniqueResolvers().length > 0 && (
                    <Tabs value={resolvedByUserId} onValueChange={setResolvedByUserId}>
                      <TabsList className="grid w-full grid-cols-1">
                        {getUniqueResolvers().slice(0, 3).map((userId) => (
                          <TabsTrigger key={userId} value={userId || ""}>
                            {userId?.slice(0, 8)}...
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}
                </div>
              </div>
            </div>

            {/* Resolved Alerts Table */}
            {alertsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : getResolvedAlerts().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum alerta resolvido encontrado para os filtros selecionados</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Disparado</TableHead>
                      <TableHead>Resolvido</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getResolvedAlerts().map((alert) => {
                      const config = alertConfigs.find(c => c.id === alert.alert_config_id);
                      const resolutionTime = alert.resolved_at 
                        ? new Date(alert.resolved_at).getTime() - new Date(alert.triggered_at).getTime()
                        : 0;

                      return (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {getAlertTypeLabel(config?.alert_type || '')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm truncate">
                              {alert.details?.message}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(alert.triggered_at).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {alert.resolved_at 
                              ? new Date(alert.resolved_at).toLocaleString("pt-BR")
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={resolutionTime < 3600000 ? "default" : "secondary"}
                              className={resolutionTime < 3600000 ? "bg-green-500" : ""}
                            >
                              {formatDuration(resolutionTime)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {alert.resolved_by?.slice(0, 8)}...
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert Metrics Dashboard Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Dashboard de Métricas de Alertas em Tempo Real</CardTitle>
            </div>
            <CardDescription>
              Análise de tendências e uso das configurações de alerta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total de Mudanças</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertMetrics.totalChanges}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {historyDateRange === 'week' ? 'Última semana' : 
                     historyDateRange === 'month' ? 'Último mês' :
                     historyDateRange === '3months' ? 'Últimos 3 meses' : 'Todo período'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Alertas Desabilitados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{alertMetrics.disabledCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alertMetrics.disableRate}% do total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Alertas Reabilitados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{alertMetrics.enabledCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alertMetrics.enableRate}% do total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Mudanças de Status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertMetrics.statusChanges}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ativar/Desativar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Ajustes de Limite</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertMetrics.thresholdChanges}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mudanças de %
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Tendências */}
            {alertMetrics.trendData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tendência de Alterações (Últimos 14 Dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={alertMetrics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="disabled" 
                        stroke="#ef4444" 
                        name="Desabilitados"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="enabled" 
                        stroke="#22c55e" 
                        name="Reabilitados"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="threshold" 
                        stroke="#3b82f6" 
                        name="Ajustes de Limite"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top Usuários */}
            {alertMetrics.topUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Usuários Mais Ativos em Configurações</CardTitle>
                  <CardDescription>
                    Top 5 usuários que mais alteraram configurações de alerta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alertMetrics.topUsers.map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-mono text-sm">{user.userId.slice(0, 8)}...</p>
                            <p className="text-xs text-muted-foreground">Usuário</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-base">
                          {user.count} {user.count === 1 ? 'alteração' : 'alterações'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Análise de Taxa de Desabilitação */}
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Análise de Risco - Taxa de Desabilitação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Desabilitação</p>
                    <p className="text-3xl font-bold text-destructive">{alertMetrics.disableRate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Taxa de Reabilitação</p>
                    <p className="text-3xl font-bold text-green-600">{alertMetrics.enableRate}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Desabilitados</span>
                    <span className="font-medium">{alertMetrics.disabledCount}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-destructive transition-all duration-500"
                      style={{ width: `${alertMetrics.disableRate}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Reabilitados</span>
                    <span className="font-medium">{alertMetrics.enabledCount}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 transition-all duration-500"
                      style={{ width: `${alertMetrics.enableRate}%` }}
                    />
                  </div>
                </div>

                {alertMetrics.disableRate > 50 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Atenção:</strong> A taxa de desabilitação está acima de 50%. 
                      Considere revisar os motivos pelos quais os usuários estão desabilitando alertas críticos.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Alert Configuration History Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              <CardTitle>Histórico de Configurações de Alerta</CardTitle>
            </div>
            <CardDescription>
              Registro completo de todas as alterações nas configurações de alertas dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros */}
            <div className="flex gap-2">
              <Tabs value={historyDateRange} onValueChange={(v) => setHistoryDateRange(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="week">Última Semana</TabsTrigger>
                  <TabsTrigger value="month">Último Mês</TabsTrigger>
                  <TabsTrigger value="3months">Últimos 3 Meses</TabsTrigger>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tabela de Histórico */}
            {configHistoryLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : configHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma alteração registrada no período selecionado</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo de Alerta</TableHead>
                      <TableHead>Campo Alterado</TableHead>
                      <TableHead>Valor Anterior</TableHead>
                      <TableHead>Novo Valor</TableHead>
                      <TableHead>Alterado Por</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configHistory.map((history) => (
                      <TableRow key={history.id}>
                        <TableCell className="font-mono text-xs">
                          {history.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            history.alert_type === 'loss_alert' ? 'border-destructive text-destructive' : 'border-green-500 text-green-500'
                          }>
                            {history.alert_type === 'loss_alert' ? '⚠️ Perda' : '🎯 Ganho'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {history.field_changed === 'enabled' ? 'Status' : 'Limite (%)'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {history.old_value ? (
                            history.field_changed === 'enabled' ? (
                              <Badge variant={history.old_value === 'true' ? 'default' : 'secondary'}>
                                {history.old_value === 'true' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            ) : (
                              <span className="font-mono">{history.old_value}%</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {history.field_changed === 'enabled' ? (
                            <Badge variant={history.new_value === 'true' ? 'default' : 'secondary'}>
                              {history.new_value === 'true' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          ) : (
                            <span className="font-mono font-semibold">{history.new_value}%</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {history.changed_by.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(history.changed_at).toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
