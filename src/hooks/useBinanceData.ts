import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BinanceData {
  balance: {
    total: string;
    available: string;
    crossWallet: string;
    used: string;
    initial: string;
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
    amount: string;
    entryPrice: string;
    markPrice: string;
    unrealizedProfit: string;
    liquidationPrice: string;
    leverage: string;
    marginRatio: string;
  }>;
  risk: {
    hasCritical: boolean;
    criticalCount: number;
    positions: Array<{
      symbol: string;
      marginRatio: string;
    }>;
    hasReachedLimit: boolean;
    riskPercent: number;
    maxAllowedLoss: string;
    currentLoss: string;
    riskLimitPercent: string;
  };
}

export const useBinanceData = () => {
  return useQuery({
    queryKey: ['binance-data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('binance-data');
      
      if (error) throw error;
      
      // Check for specific error codes
      if (data && typeof data === 'object' && 'error' in data) {
        const errorData = data as { error: string; message?: string };
        if (errorData.error === 'BINANCE_KEYS_INVALID') {
          throw new Error('BINANCE_KEYS_INVALID');
        }
        throw new Error(errorData.message || errorData.error);
      }
      
      return data as BinanceData;
    },
    refetchInterval: 5000,
    retry: (failureCount, error) => {
      // Don't retry if it's a key validation error
      if (error instanceof Error && error.message === 'BINANCE_KEYS_INVALID') {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Kill-switch functionality removed

export const activateVoucher = async (code: string) => {
  const { data, error } = await supabase.functions.invoke('activate-voucher', {
    body: { code },
  });
  
  if (error) throw error;
  if (data?.error_code) throw data;
  return data;
};
