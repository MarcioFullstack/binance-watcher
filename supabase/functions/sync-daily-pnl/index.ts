import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active Binance account
    const { data: binanceAccount, error: accountError } = await supabaseClient
      .from("binance_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (accountError || !binanceAccount) {
      return new Response(
        JSON.stringify({ error: "No active Binance account found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { date, market_type = "USDT" } = await req.json();

    // Calculate PnL for the specified date
    // This is a simplified version - you would need to implement actual Binance API calls
    // to fetch historical PnL data for the specific date
    
    const startTime = new Date(date).setUTCHours(0, 0, 0, 0);
    const endTime = new Date(date).setUTCHours(23, 59, 59, 999);

    // Here you would call Binance API to get income history for the date
    // For now, we'll use mock data
    const pnlUsd = Math.random() * 10 - 5; // Random value between -5 and +5
    const pnlPercentage = Math.random() * 2 - 1; // Random percentage between -1% and +1%

    // Upsert the daily PnL record
    const { data: pnlRecord, error: pnlError } = await supabaseClient
      .from("daily_pnl")
      .upsert(
        {
          user_id: user.id,
          date: date,
          pnl_usd: pnlUsd,
          pnl_percentage: pnlPercentage,
          market_type: market_type,
        },
        {
          onConflict: "user_id,date,market_type",
        }
      )
      .select()
      .single();

    if (pnlError) throw pnlError;

    return new Response(
      JSON.stringify({
        success: true,
        data: pnlRecord,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error syncing daily PnL:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});