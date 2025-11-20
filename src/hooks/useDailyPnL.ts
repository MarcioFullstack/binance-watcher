import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDailyPnL = () => {
  return useQuery({
    queryKey: ['daily-pnl'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Buscar últimos 365 dias de PnL
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const { data, error } = await supabase
        .from('daily_pnl')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', oneYearAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      // Calcular totais por período
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const last7Days = data?.filter(d => new Date(d.date) >= sevenDaysAgo) || [];
      const last30Days = data?.filter(d => new Date(d.date) >= thirtyDaysAgo) || [];

      const sum7Days = last7Days.reduce((sum, d) => sum + Number(d.pnl_usd), 0);
      const sumPercent7Days = last7Days.reduce((sum, d) => sum + Number(d.pnl_percentage), 0);

      const sum30Days = last30Days.reduce((sum, d) => sum + Number(d.pnl_usd), 0);
      const sumPercent30Days = last30Days.reduce((sum, d) => sum + Number(d.pnl_percentage), 0);

      const sumAllTime = data?.reduce((sum, d) => sum + Number(d.pnl_usd), 0) || 0;
      const sumPercentAllTime = data?.reduce((sum, d) => sum + Number(d.pnl_percentage), 0) || 0;

      return {
        last7Days: {
          pnl: sum7Days,
          percent: sumPercent7Days,
        },
        last30Days: {
          pnl: sum30Days,
          percent: sumPercent30Days,
        },
        allTime: {
          pnl: sumAllTime,
          percent: sumPercentAllTime,
        },
        dailyData: data || [],
      };
    },
    refetchInterval: 300000, // Refetch every 5 minutes (daily data doesn't change frequently)
  });
};
