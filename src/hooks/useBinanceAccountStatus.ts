import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useBinanceAccountStatus = (userId?: string) => {
  return useQuery({
    queryKey: ['binance-account-status', userId],
    queryFn: async () => {
      if (!userId) {
        return { hasAccount: false, isActive: false };
      }

      const { data: accounts, error } = await supabase
        .from('binance_accounts')
        .select('id, is_active, account_name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking Binance account:', error);
        return { hasAccount: false, isActive: false };
      }

      return {
        hasAccount: !!accounts,
        isActive: accounts?.is_active || false,
        accountName: accounts?.account_name,
      };
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
};
