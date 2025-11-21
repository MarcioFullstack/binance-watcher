import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface BinanceData {
  balance: {
    total: string;
    available: string;
    used: string;
    initial: string;
  };
  pnl: {
    today: string;
    todayPercent: string;
    realized: string;
    unrealized: string;
    totalFromInitial: string;
    totalPercent: string;
  };
  positions: Array<{
    symbol: string;
    positionAmt: string;
    unrealizedProfit: string;
    leverage: string;
  }>;
  risk: {
    currentRiskPercent: number;
    maxRiskPercent: number;
    killSwitchActive: boolean;
  };
}

export const useBinanceData = () => {
  const queryClient = useQueryClient();

  // Setup realtime subscription for immediate updates
  useEffect(() => {
    let channel: any;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to notification_history changes to trigger data refresh
      channel = supabase
        .channel('binance-data-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification_history',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Invalidate and refetch binance data immediately
            queryClient.invalidateQueries({ queryKey: ['binance-data'] });
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['binance-data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('binance-data');

      if (error) {
        if (error.message?.includes('BINANCE_KEYS_INVALID')) {
          throw new Error('BINANCE_KEYS_INVALID');
        }
        throw error;
      }

      return data as BinanceData;
    },
    refetchInterval: 5000, // Reduced to 5 seconds for faster updates
    refetchIntervalInBackground: true,
    staleTime: 2000, // Consider data stale after 2 seconds
    retry: (failureCount, error) => {
      // Don't retry if it's a keys validation error
      if (error instanceof Error && error.message === 'BINANCE_KEYS_INVALID') {
        return false;
      }
      return failureCount < 3;
    },
  });
};
