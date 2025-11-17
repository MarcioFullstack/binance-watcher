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

    const startTime = new Date(date).setUTCHours(0, 0, 0, 0);
    const endTime = new Date(date).setUTCHours(23, 59, 59, 999);

    // Prepare query parameters for Binance API
    const timestamp = Date.now();
    const queryString = `startTime=${startTime}&endTime=${endTime}&incomeType=REALIZED_PNL&timestamp=${timestamp}&recvWindow=5000`;

    // Create signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(binanceAccount.api_secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(queryString)
    );
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Fetch income history from Binance
    const incomeResponse = await fetch(
      `https://fapi.binance.com/fapi/v1/income?${queryString}&signature=${signatureHex}`,
      {
        headers: {
          "X-MBX-APIKEY": binanceAccount.api_key,
        },
      }
    );

    if (!incomeResponse.ok) {
      const errorText = await incomeResponse.text();
      console.error("Binance income API error:", errorText);
      throw new Error(`Failed to fetch income data: ${errorText}`);
    }

    const incomeData = await incomeResponse.json();

    // Calculate total realized PnL for the day
    let pnlUsd = 0;
    if (Array.isArray(incomeData)) {
      pnlUsd = incomeData.reduce((sum: number, item: any) => {
        return sum + parseFloat(item.income || "0");
      }, 0);
    }

    // Calculate percentage based on account balance
    // Fetch current balance to calculate percentage
    const balanceQueryString = `timestamp=${timestamp}&recvWindow=5000`;
    const balanceKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(binanceAccount.api_secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const balanceSignature = await crypto.subtle.sign(
      "HMAC",
      balanceKey,
      encoder.encode(balanceQueryString)
    );
    const balanceSignatureHex = Array.from(new Uint8Array(balanceSignature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const balanceResponse = await fetch(
      `https://fapi.binance.com/fapi/v2/balance?${balanceQueryString}&signature=${balanceSignatureHex}`,
      {
        headers: {
          "X-MBX-APIKEY": binanceAccount.api_key,
        },
      }
    );

    let totalBalance = 1000; // Default fallback
    if (balanceResponse.ok) {
      const balances = await balanceResponse.json();
      const usdtBalance = balances.find((b: any) => b.asset === "USDT");
      if (usdtBalance) {
        totalBalance = parseFloat(usdtBalance.balance || "1000");
      }
    }

    const pnlPercentage = totalBalance > 0 ? (pnlUsd / totalBalance) * 100 : 0;

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