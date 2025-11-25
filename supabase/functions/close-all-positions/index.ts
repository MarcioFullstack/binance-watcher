import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createSignature(secret: string, queryString: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(queryString));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Closing all positions for user: ${user.id}`);

    // Get active Binance account
    const { data: accounts, error: accountsError } = await supabase
      .from('binance_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (accountsError || !accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ error: 'No active Binance account found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const account = accounts[0];
    
    // Decrypt credentials
    const apiKey = await decrypt(account.api_key);
    const apiSecret = await decrypt(account.api_secret);

    // Fetch all open positions
    const timestamp = Date.now();
    const positionsParams = `timestamp=${timestamp}`;
    const positionsSignature = await createSignature(apiSecret, positionsParams);
    
    const positionsUrl = `https://fapi.binance.com/fapi/v2/positionRisk?${positionsParams}&signature=${positionsSignature}`;
    const positionsResponse = await fetch(positionsUrl, {
      headers: { 'X-MBX-APIKEY': apiKey },
    });

    if (!positionsResponse.ok) {
      const errorText = await positionsResponse.text();
      throw new Error(`Failed to fetch positions: ${errorText}`);
    }

    const positions = await positionsResponse.json();
    const openPositions = positions.filter((pos: any) => parseFloat(pos.positionAmt) !== 0);

    console.log(`Found ${openPositions.length} open positions to close`);

    const closedPositions = [];
    const errors = [];

    // Close each position
    for (const position of openPositions) {
      try {
        const positionAmt = parseFloat(position.positionAmt);
        const symbol = position.symbol;
        const side = positionAmt > 0 ? 'SELL' : 'BUY';
        const quantity = Math.abs(positionAmt);

        console.log(`Closing position: ${symbol}, Side: ${side}, Quantity: ${quantity}`);

        const orderTimestamp = Date.now();
        const orderParams = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${orderTimestamp}`;
        const orderSignature = await createSignature(apiSecret, orderParams);

        const orderUrl = `https://fapi.binance.com/fapi/v1/order`;
        const orderResponse = await fetch(orderUrl, {
          method: 'POST',
          headers: {
            'X-MBX-APIKEY': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `${orderParams}&signature=${orderSignature}`,
        });

        if (!orderResponse.ok) {
          const errorText = await orderResponse.text();
          throw new Error(`Failed to close ${symbol}: ${errorText}`);
        }

        const orderResult = await orderResponse.json();
        closedPositions.push({
          symbol,
          side,
          quantity,
          orderId: orderResult.orderId,
        });

        console.log(`Successfully closed position: ${symbol}`);
      } catch (error: any) {
        console.error(`Error closing position ${position.symbol}:`, error.message);
        errors.push({
          symbol: position.symbol,
          error: error.message,
        });
      }
    }

    // Log the action in notification history
    await supabase
      .from('notification_history')
      .insert({
        user_id: user.id,
        type: 'position_closure',
        title: '🔒 Todas as Posições Fechadas',
        description: `${closedPositions.length} posições foram fechadas automaticamente pelo alarme de perda.`,
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Closed ${closedPositions.length} positions`,
        closedPositions,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error closing positions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
