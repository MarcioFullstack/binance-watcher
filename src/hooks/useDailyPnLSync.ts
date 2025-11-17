import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subDays, eachDayOfInterval, format } from "date-fns";
import { toast } from "sonner";

export const useDailyPnLSync = (userId?: string) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [hasAccount, setHasAccount] = useState(false);

  const checkBinanceAccount = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data: accounts } = await supabase
        .from('binance_accounts')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

      setHasAccount(accounts && accounts.length > 0);
    } catch (error) {
      console.error('Error checking Binance account:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    
    checkBinanceAccount();
  }, [userId, checkBinanceAccount]);

  const syncPnLData = useCallback(async () => {
    if (!hasAccount) {
      console.log('No active Binance account, skipping sync');
      return;
    }

    try {
      setIsSyncing(true);
      toast.info("Syncing PnL data from Binance API...", {
        description: "Fetching historical data for the last 30 days"
      });
      
      const today = new Date();
      const start = startOfMonth(subDays(today, 30));
      const days = eachDayOfInterval({ start, end: today });
      
      // Sync historical data for both market types
      const marketTypes = ['USDT', 'COIN'];
      const totalOperations = days.length * marketTypes.length;
      let completedOperations = 0;
      let successfulSyncs = 0;
      let failedSyncs = 0;
      
      setSyncProgress({ current: 0, total: totalOperations });
      
      for (const marketType of marketTypes) {
        for (const day of days) {
            const dateStr = format(day, 'yyyy-MM-dd');
            
            // Skip future dates
            if (day > today) continue;
            
            try {
              // Call edge function to sync data for this specific date
              const { error } = await supabase.functions.invoke('sync-daily-pnl', {
                body: { 
                  date: dateStr,
                  market_type: marketType
                }
              });
              
              if (error) {
                console.error(`Error syncing PnL for ${dateStr} (${marketType}):`, error);
                failedSyncs++;
              } else {
                successfulSyncs++;
              }
              
              completedOperations++;
              setSyncProgress({ current: completedOperations, total: totalOperations });
            } catch (error) {
              console.error(`Error syncing ${dateStr}:`, error);
              completedOperations++;
              failedSyncs++;
              setSyncProgress({ current: completedOperations, total: totalOperations });
            }
          }
        }
        
        console.log('Successfully initiated PnL sync for historical data');
        
        // Show detailed success notification
        if (failedSyncs === 0) {
          toast.success("Sync completed successfully!", {
            description: `${successfulSyncs} records synced from Binance API`
          });
        } else if (successfulSyncs > 0) {
          toast.warning("Sync completed with errors", {
            description: `${successfulSyncs} synced, ${failedSyncs} failed`
          });
        } else {
          toast.error("Sync failed", {
            description: "Could not sync any data. Please check your API keys."
          });
        }
      } catch (error) {
        console.error('Error in useDailyPnLSync:', error);
        toast.error("Sync failed", {
          description: error instanceof Error ? error.message : "Unknown error occurred"
        });
      } finally {
        setIsSyncing(false);
      }
    }, [hasAccount]);

  useEffect(() => {
    if (!userId) return;

    // Listen for changes in Binance accounts
    const accountsChannel = supabase
      .channel('binance-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'binance_accounts',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Binance account changed:', payload);
          await checkBinanceAccount();
          
          // If account was activated, start sync immediately
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && payload.new.is_active)) {
            toast.success("Binance API connected!", {
              description: "Starting automatic sync of your trading data..."
            });
            setTimeout(() => syncPnLData(), 1000);
          }
        }
      )
      .subscribe();

    // Run sync immediately if has account
    if (hasAccount) {
      syncPnLData();
    }

    // Set up periodic sync every 6 hours
    const interval = setInterval(syncPnLData, 6 * 60 * 60 * 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(accountsChannel);
    };
  }, [userId, hasAccount, syncPnLData, checkBinanceAccount]);

  return { isSyncing, syncProgress };
};