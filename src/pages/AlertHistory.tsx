import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Loader2, 
  History, 
  AlertCircle, 
  AlertTriangle, 
  AlertOctagon, 
  Siren,
  CheckCircle,
  TrendingDown,
  Calendar,
  ArrowLeft
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface AlertHistoryItem {
  id: string;
  level_name: string;
  loss_percentage: number;
  loss_amount: number;
  balance_at_alert: number;
  initial_balance: number;
  alert_message: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  triggered_at: string;
}

const levelConfig = {
  warning: {
    icon: AlertCircle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500",
    badge: "bg-yellow-500",
  },
  danger: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500",
    badge: "bg-orange-500",
  },
  critical: {
    icon: AlertOctagon,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500",
    badge: "bg-red-500",
  },
  emergency: {
    icon: Siren,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive",
    badge: "bg-destructive",
  },
};

const AlertHistory = () => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    acknowledged: 0,
    pending: 0,
    byLevel: { warning: 0, danger: 0, critical: 0, emergency: 0 },
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAlertHistory();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!roles);
  };

  const loadAlertHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("loss_alert_history")
        .select("*")
        .eq("user_id", user.id)
        .order("triggered_at", { ascending: false });

      if (error) throw error;

      setAlerts(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const acknowledged = data?.filter(a => a.acknowledged).length || 0;
      const pending = total - acknowledged;
      
      const byLevel = {
        warning: data?.filter(a => a.level_name === 'warning').length || 0,
        danger: data?.filter(a => a.level_name === 'danger').length || 0,
        critical: data?.filter(a => a.level_name === 'critical').length || 0,
        emergency: data?.filter(a => a.level_name === 'emergency').length || 0,
      };

      setStats({ total, acknowledged, pending, byLevel });
    } catch (error) {
      console.error("Error loading alert history:", error);
      toast.error("Erro ao carregar histórico de alertas");
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("loss_alert_history")
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      toast.success("Alerta reconhecido!");
      loadAlertHistory();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      toast.error("Erro ao reconhecer alerta");
    }
  };

  // Prepare data for timeline chart
  const chartData = alerts
    .slice(0, 30) // Last 30 alerts
    .reverse()
    .map((alert, index) => ({
      index: index + 1,
      percentage: Math.abs(alert.loss_percentage),
      level: alert.level_name,
      date: format(new Date(alert.triggered_at), "dd/MM HH:mm"),
    }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
              <History className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Histórico de Alertas</h1>
                <p className="text-muted-foreground">
                  Visualize e gerencie todos os alertas de perda disparados
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Alertas</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <History className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Reconhecidos</p>
                      <p className="text-2xl font-bold text-green-500">{stats.acknowledged}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Emergências</p>
                      <p className="text-2xl font-bold text-destructive">{stats.byLevel.emergency}</p>
                    </div>
                    <Siren className="h-8 w-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeline Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Timeline de Alertas (Últimos 30)
                  </CardTitle>
                  <CardDescription>
                    Evolução das perdas ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ value: 'Perda (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold">{data.date}</p>
                                <p className="text-sm text-muted-foreground">
                                  Perda: {data.percentage.toFixed(2)}%
                                </p>
                                <Badge className={`mt-1 ${levelConfig[data.level as keyof typeof levelConfig].badge}`}>
                                  {data.level.toUpperCase()}
                                </Badge>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine y={2} stroke="#eab308" strokeDasharray="3 3" label="Warning" />
                      <ReferenceLine y={5} stroke="#f97316" strokeDasharray="3 3" label="Danger" />
                      <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="3 3" label="Critical" />
                      <ReferenceLine y={10} stroke="#dc2626" strokeDasharray="3 3" label="Emergency" />
                      <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Alert List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Histórico Detalhado
                </CardTitle>
                <CardDescription>
                  Todos os alertas de perda disparados em ordem cronológica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum alerta registrado ainda</p>
                  </div>
                ) : (
                  alerts.map((alert, index) => {
                    const config = levelConfig[alert.level_name as keyof typeof levelConfig];
                    const Icon = config.icon;

                    return (
                      <div key={alert.id}>
                        <div className={`p-4 rounded-lg border ${config.border} ${config.bg} ${alert.acknowledged ? 'opacity-60' : ''}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <Icon className={`h-6 w-6 ${config.color} mt-1`} />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={config.badge}>
                                    {alert.level_name.toUpperCase()}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(alert.triggered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                  {alert.acknowledged && (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Reconhecido
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="font-medium">{alert.alert_message}</p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Perda</p>
                                    <p className={`font-semibold ${config.color}`}>
                                      {alert.loss_percentage.toFixed(2)}%
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Valor</p>
                                    <p className="font-semibold">
                                      ${Math.abs(alert.loss_amount).toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Saldo no Alerta</p>
                                    <p className="font-semibold">
                                      ${alert.balance_at_alert.toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Saldo Inicial</p>
                                    <p className="font-semibold">
                                      ${alert.initial_balance.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {!alert.acknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAcknowledge(alert.id)}
                                className="shrink-0"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Reconhecer
                              </Button>
                            )}
                          </div>
                        </div>
                        {index < alerts.length - 1 && <Separator className="my-3" />}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AlertHistory;
