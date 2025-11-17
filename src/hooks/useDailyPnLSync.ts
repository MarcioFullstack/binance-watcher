import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subDays, eachDayOfInterval, format } from "date-fns";

export const useDailyPnLSync = (userId?: string) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (!userId) return;

    const syncPnLData = async () => {
      try {
        setIsSyncing(true);
        const today = new Date();
        const start = startOfMonth(subDays(today, 30));
        const days = eachDayOfInterval({ start, end: today });
        
        // Sync historical data for both market types
        const marketTypes = ['USDT', 'COIN'];
        const totalOperations = days.length * marketTypes.length;
        let completedOperations = 0;
        
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
              }
              
              completedOperations++;
              setSyncProgress({ current: completedOperations, total: totalOperations });
            } catch (error) {
              console.error(`Error syncing ${dateStr}:`, error);
              completedOperations++;
              setSyncProgress({ current: completedOperations, total: totalOperations });
            }
          }
        }
        
        console.log('Successfully initiated PnL sync for historical data');
      } catch (error) {
        console.error('Error in useDailyPnLSync:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Run sync immediately
    syncPnLData();

    // Set up periodic sync every 6 hours
    const interval = setInterval(syncPnLData, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  return { isSyncing, syncProgress };
};