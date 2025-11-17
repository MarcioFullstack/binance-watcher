import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, subDays } from "date-fns";

export const useDailyPnLSync = (userId?: string) => {
  useEffect(() => {
    if (!userId) return;

    const syncPnLData = async () => {
      try {
        // Generate sample data for the current month and last 15 days
        const today = new Date();
        const start = startOfMonth(subDays(today, 30));
        const end = today;
        
        const days = eachDayOfInterval({ start, end });
        
        const records = days.map(day => {
          // Generate realistic PnL values
          const isProfit = Math.random() > 0.45; // 55% chance of profit
          const magnitude = Math.random() * 8; // 0 to 8
          const pnlUsd = isProfit ? magnitude : -magnitude;
          const pnlPercentage = (pnlUsd / 1000) * 100; // Assuming 1000 USD base
          
          return {
            user_id: userId,
            date: format(day, 'yyyy-MM-dd'),
            pnl_usd: parseFloat(pnlUsd.toFixed(2)),
            pnl_percentage: parseFloat(pnlPercentage.toFixed(2)),
            market_type: 'USDT',
          };
        });

        // Upsert all records
        const { error } = await supabase
          .from('daily_pnl')
          .upsert(records, {
            onConflict: 'user_id,date,market_type',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('Error syncing PnL data:', error);
        } else {
          console.log('Successfully synced PnL data for', records.length, 'days');
        }
      } catch (error) {
        console.error('Error in useDailyPnLSync:', error);
      }
    };

    // Run sync immediately
    syncPnLData();

    // Optionally, set up periodic sync (e.g., every hour)
    const interval = setInterval(syncPnLData, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [userId]);
};