import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BinanceData {
  balance: {
    total: string;
    available: string;
    used: string;
  };
  pnl: {
    today: string;
    todayPercent: string;
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
    refetchInterval: 5000, // Refetch every 5 seconds
    retry: (failureCount, error) => {
      // Don't retry if it's a keys validation error
      if (error instanceof Error && error.message === 'BINANCE_KEYS_INVALID') {
        return false;
      }
      return failureCount < 3;
    },
  });
};
