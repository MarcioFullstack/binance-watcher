import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily PnL sync for all users...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get all users with active Binance accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('binance_accounts')
      .select('user_id, account_name')
      .eq('is_active', true);

    if (accountsError) {
      throw accountsError;
    }

    if (!accounts || accounts.length === 0) {
      console.log('No active Binance accounts found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active accounts to sync',
          synced: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${accounts.length} active accounts`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Get yesterday's date (since we sync at midnight)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateToSync = yesterday.toISOString().split('T')[0];

    console.log(`Syncing data for date: ${dateToSync}`);

    // Sync each user's data
    for (const account of accounts) {
      try {
        console.log(`Syncing PnL for user: ${account.user_id} (${account.account_name})`);

        // Sync USDT market
        const { data: usdtData, error: usdtError } = await supabaseAdmin.functions.invoke(
          'sync-daily-pnl',
          {
            body: { 
              date: dateToSync,
              marketType: 'USDT',
              userId: account.user_id
            }
          }
        );

        if (usdtError) {
          console.error(`Error syncing USDT for ${account.user_id}:`, usdtError);
          throw usdtError;
        }

        // Sync COIN market
        const { data: coinData, error: coinError } = await supabaseAdmin.functions.invoke(
          'sync-daily-pnl',
          {
            body: { 
              date: dateToSync,
              marketType: 'COIN',
              userId: account.user_id
            }
          }
        );

        if (coinError) {
          console.error(`Error syncing COIN for ${account.user_id}:`, coinError);
          throw coinError;
        }

        console.log(`Successfully synced PnL for ${account.user_id}`);
        successCount++;
        
        results.push({
          user_id: account.user_id,
          account_name: account.account_name,
          status: 'success',
          usdt: usdtData,
          coin: coinData
        });

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`Failed to sync for user ${account.user_id}:`, error);
        errorCount++;
        
        results.push({
          user_id: account.user_id,
          account_name: account.account_name,
          status: 'error',
          error: error?.message || 'Unknown error'
        });
      }
    }

    const summary = {
      success: true,
      date: dateToSync,
      total_accounts: accounts.length,
      synced: successCount,
      errors: errorCount,
      results: results
    };

    console.log('Daily PnL sync completed:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in sync-all-daily-pnl function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
