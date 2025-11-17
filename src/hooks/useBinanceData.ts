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
      const { data, error } = await supabase.functions.invoke('binance-data');
      
      if (error) throw error;
      return data as BinanceData;
    },
    refetchInterval: 5000, // Atualizar a cada 5 segundos
    retry: 2,
  });
};

export const executeKillSwitch = async () => {
  const { data, error } = await supabase.functions.invoke('binance-kill-switch', {
    method: 'POST',
  });
  
  if (error) throw error;
  return data;
};

export const activateVoucher = async (code: string) => {
  const { data, error } = await supabase.functions.invoke('activate-voucher', {
    body: { code },
  });
  
  if (error) throw error;
  if (data?.error_code) throw data;
  return data;
};
