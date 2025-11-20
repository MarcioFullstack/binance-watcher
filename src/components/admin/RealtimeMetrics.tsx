import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Bell, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RealtimeMetrics {
  activeUsers: number;
  totalUsers: number;
  pendingPayments: number;
  totalPayments: number;
  activeAlerts: number;
  resolvedAlerts: number;
}

interface ActivityPoint {
  time: string;
  value: number;
}

export const RealtimeMetrics = () => {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    activeUsers: 0,
    totalUsers: 0,
    pendingPayments: 0,
    totalPayments: 0,
    activeAlerts: 0,
    resolvedAlerts: 0,
  });
  
  const [userActivity, setUserActivity] = useState<ActivityPoint[]>([]);
  const [paymentActivity, setPaymentActivity] = useState<ActivityPoint[]>([]);

  const updateMetrics = async () => {
    try {
      // Fetch active users (subscriptions active)
      const { data: activeSubscriptions } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact" })
        .eq("status", "active");

      // Fetch total users
      const { data: allUsers, count: totalUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch pending payments
      const { data: pendingPayments } = await supabase
        .from("pending_payments")
        .select("*", { count: "exact" })
        .eq("status", "pending");

      // Fetch total payments
      const { data: allPayments, count: totalPaymentsCount } = await supabase
        .from("pending_payments")
        .select("*", { count: "exact", head: true });

      // Fetch active alerts
      const { data: activeAlerts } = await supabase
        .from("alerts")
        .select("*", { count: "exact" })
        .eq("is_resolved", false);

      // Fetch resolved alerts
      const { data: resolvedAlerts } = await supabase
        .from("alerts")
        .select("*", { count: "exact" })
        .eq("is_resolved", true);

      setMetrics({
        activeUsers: activeSubscriptions?.length || 0,
        totalUsers: totalUsersCount || 0,
        pendingPayments: pendingPayments?.length || 0,
        totalPayments: totalPaymentsCount || 0,
        activeAlerts: activeAlerts?.length || 0,
        resolvedAlerts: resolvedAlerts?.length || 0,
      });

      // Update activity charts
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      setUserActivity(prev => {
        const newData = [...prev, { time: timeLabel, value: activeSubscriptions?.length || 0 }];
        return newData.slice(-10); // Keep last 10 points
      });

      setPaymentActivity(prev => {
        const newData = [...prev, { time: timeLabel, value: pendingPayments?.length || 0 }];
        return newData.slice(-10); // Keep last 10 points
      });
    } catch (error) {
      console.error("Error updating metrics:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    updateMetrics();

    // Update every 10 seconds
    const interval = setInterval(updateMetrics, 10000);

    // Setup realtime subscriptions
    const usersChannel = supabase
      .channel("realtime-users")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
        },
        () => {
          updateMetrics();
        }
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel("realtime-payments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_payments",
        },
        () => {
          updateMetrics();
        }
      )
      .subscribe();

    const alertsChannel = supabase
      .channel("realtime-alerts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
        },
        () => {
          updateMetrics();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const percentageChange = (current: number, total: number) => {
    if (total === 0) return 0;
    return ((current / total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Users Card */}
        <Card className="border-glow hover:glow-primary-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{metrics.activeUsers}</div>
              <Badge variant="secondary" className="text-xs">
                {percentageChange(metrics.activeUsers, metrics.totalUsers)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {metrics.totalUsers} usuários totais
            </p>
            <div className="flex items-center mt-2 text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Tempo real</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments Card */}
        <Card className="border-glow hover:glow-primary-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{metrics.pendingPayments}</div>
              <Badge variant={metrics.pendingPayments > 5 ? "destructive" : "secondary"} className="text-xs">
                {metrics.pendingPayments > 5 ? "Alto" : "Normal"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {metrics.totalPayments} pagamentos totais
            </p>
            <div className="flex items-center mt-2 text-xs text-blue-600">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              <span>Monitorando</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts Card */}
        <Card className="border-glow hover:glow-primary-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{metrics.activeAlerts}</div>
              <Badge variant={metrics.activeAlerts > 0 ? "destructive" : "secondary"} className="text-xs">
                {metrics.activeAlerts > 0 ? "Atenção" : "OK"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.resolvedAlerts} resolvidos
            </p>
            <div className="flex items-center mt-2 text-xs text-orange-600">
              {metrics.activeAlerts > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Requer ação</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 mr-1" />
                  <span>Estável</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-glow">
          <CardHeader>
            <CardTitle className="text-base">Atividade de Usuários</CardTitle>
            <CardDescription>Últimos 10 pontos de dados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={userActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-glow">
          <CardHeader>
            <CardTitle className="text-base">Atividade de Pagamentos</CardTitle>
            <CardDescription>Pagamentos pendentes ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={paymentActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
