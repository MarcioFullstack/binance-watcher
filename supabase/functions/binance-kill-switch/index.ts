import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createSignature(secret: string, queryString: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(queryString);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Buscar conta Binance ativa
    const { data: accounts, error: accountError } = await supabaseClient
      .from('binance_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (accountError || !accounts) {
      throw new Error('Nenhuma conta Binance ativa encontrada');
    }

    const apiKey = accounts.api_key;
    const apiSecret = accounts.api_secret;
    const baseURL = 'https://fapi.binance.com';

    const timestamp = Date.now();
    const recvWindow = 5000;

    // 1. Buscar todas as posições abertas
    const positionsQuery = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const positionsSignature = await createSignature(apiSecret, positionsQuery);
    
    const positionsResponse = await fetch(
      `${baseURL}/fapi/v2/positionRisk?${positionsQuery}&signature=${positionsSignature}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      }
    );

    const positionsData = await positionsResponse.json();
    const openPositions = positionsData.filter((p: any) => parseFloat(p.positionAmt) !== 0);

    if (openPositions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma posição aberta para fechar', closed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fechar cada posição com ordem MARKET
    const closedOrders = [];
    const errors = [];

    for (const position of openPositions) {
      try {
        const positionAmt = parseFloat(position.positionAmt);
        const symbol = position.symbol;
        
        // Determinar side oposto
        const side = positionAmt > 0 ? 'SELL' : 'BUY';
        const quantity = Math.abs(positionAmt).toFixed(8);

        const orderQuery = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${Date.now()}&recvWindow=${recvWindow}`;
        const orderSignature = await createSignature(apiSecret, orderQuery);

        const orderResponse = await fetch(
          `${baseURL}/fapi/v1/order?${orderQuery}&signature=${orderSignature}`,
          {
            method: 'POST',
            headers: {
              'X-MBX-APIKEY': apiKey,
            },
          }
        );

        const orderData = await orderResponse.json();

        if (orderResponse.ok) {
          closedOrders.push({
            symbol,
            side,
            quantity,
            orderId: orderData.orderId,
          });
          console.log(`Posição fechada: ${symbol} ${side} ${quantity}`);
        } else {
          errors.push({
            symbol,
            error: orderData,
          });
          console.error(`Erro ao fechar ${symbol}:`, orderData);
        }
      } catch (error: any) {
        errors.push({
          symbol: position.symbol,
          error: error.message,
        });
        console.error(`Erro ao processar ${position.symbol}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Kill-switch executado',
        totalPositions: openPositions.length,
        closed: closedOrders.length,
        closedOrders,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in kill-switch function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
