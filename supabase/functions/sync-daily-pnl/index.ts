import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/encryption.ts";

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
      console.error("Authentication error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Syncing PnL for user: ${user.id}`);

    // Get active Binance account
    const { data: binanceAccount, error: accountError } = await supabaseClient
      .from("binance_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (accountError || !binanceAccount) {
      console.error("Binance account error:", accountError);
      return new Response(
        JSON.stringify({ error: "No active Binance account found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Using Binance account: ${binanceAccount.account_name}`);

    // Decrypt API credentials
    let apiKey: string;
    let apiSecret: string;
    
    try {
      apiKey = await decrypt(binanceAccount.api_key);
      apiSecret = await decrypt(binanceAccount.api_secret);
    } catch (decryptError) {
      console.error("Decryption failed for Binance credentials:", decryptError);
      return new Response(
        JSON.stringify({ 
          error: "BINANCE_KEYS_INVALID",
          message: "Failed to decrypt Binance API keys. Please reconfigure your Binance account."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { date, market_type = "USDT" } = await req.json();

    console.log(`Syncing data for date: ${date}, market: ${market_type}`);

    const startTime = new Date(date).setUTCHours(0, 0, 0, 0);
    const endTime = new Date(date).setUTCHours(23, 59, 59, 999);

    console.log(`Time range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

    // Prepare query parameters for Binance Futures API
    const timestamp = Date.now();
    const queryString = `startTime=${startTime}&endTime=${endTime}&incomeType=REALIZED_PNL&timestamp=${timestamp}&recvWindow=5000`;
    
    console.log("Calling Binance Futures API: /fapi/v1/income");

    // Create signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
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

    // Fetch income history from Binance Futures API
    const incomeResponse = await fetch(
      `https://fapi.binance.com/fapi/v1/income?${queryString}&signature=${signatureHex}`,
      {
        headers: {
          "X-MBX-APIKEY": apiKey,
        },
      }
    );

    if (!incomeResponse.ok) {
      const errorText = await incomeResponse.text();
      console.error("Binance Futures API error:", errorText);
      throw new Error(`Failed to fetch income data from Binance Futures: ${errorText}`);
    }

    const incomeData = await incomeResponse.json();
    console.log(`Received ${Array.isArray(incomeData) ? incomeData.length : 0} income records from Binance Futures`);

    // Calculate total realized PnL for the day
    let pnlUsd = 0;
    if (Array.isArray(incomeData)) {
      pnlUsd = incomeData.reduce((sum: number, item: any) => {
        const income = parseFloat(item.income || "0");
        console.log(`  - ${item.symbol || 'N/A'}: ${income} ${item.asset || 'USDT'} (${item.incomeType})`);
        return sum + income;
      }, 0);
    }
    
    console.log(`Total realized PnL for ${date}: ${pnlUsd} USDT`);

    // Buscar configurações de risco para obter initial_balance
    console.log("Fetching user risk settings for initial balance...");
    const { data: riskSettings } = await supabaseClient
      .from('risk_settings')
      .select('initial_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    // Calculate percentage based on account balance
    // Fetch current Futures balance to calculate percentage
    console.log("Fetching Futures account balance...");
    const balanceQueryString = `timestamp=${timestamp}&recvWindow=5000`;
    const balanceKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(apiSecret),
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
          "X-MBX-APIKEY": apiKey,
        },
      }
    );

    let totalBalance = 1000; // Default fallback
    if (balanceResponse.ok) {
      const balances = await balanceResponse.json();
      console.log(`Received ${balances.length} balance entries from Binance Futures`);
      const usdtBalance = balances.find((b: any) => b.asset === "USDT");
      if (usdtBalance) {
        totalBalance = parseFloat(usdtBalance.balance || "1000");
        console.log(`Current USDT Futures balance: ${totalBalance}`);
      } else {
        console.warn("USDT balance not found in Futures account");
      }
    } else {
      const errorText = await balanceResponse.text();
      console.error("Failed to fetch Futures balance:", errorText);
    }

    // Usar initial_balance como base se existir, senão usar saldo atual
    const baseBalance = riskSettings?.initial_balance || totalBalance;
    console.log(`Using base balance for percentage calculation: ${baseBalance} (${riskSettings?.initial_balance ? 'from risk_settings' : 'from current balance'})`);
    
    const pnlPercentage = baseBalance > 0 ? (pnlUsd / baseBalance) * 100 : 0;
    console.log(`PnL percentage: ${pnlPercentage.toFixed(2)}% (PnL: ${pnlUsd} USDT / Base: ${baseBalance} USDT)`);

    // Upsert the daily PnL record
    console.log("Saving to database...");
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

    if (pnlError) {
      console.error("Database error:", pnlError);
      throw pnlError;
    }

    console.log("✓ Successfully synced and saved PnL data");

    return new Response(
      JSON.stringify({
        success: true,
        data: pnlRecord,
        debug: {
          date,
          market_type,
          records_found: Array.isArray(incomeData) ? incomeData.length : 0,
          total_pnl: pnlUsd,
          balance: totalBalance,
          percentage: pnlPercentage,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error syncing daily PnL:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: error?.message || "Unknown error",
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});