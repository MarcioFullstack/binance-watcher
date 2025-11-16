import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para criar assinatura HMAC SHA256
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

    // Buscar conta Binance ativa do usuário
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

    // Timestamp e recvWindow
    const timestamp = Date.now();
    const recvWindow = 5000;

    // 1. Buscar saldo da conta
    const balanceQuery = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const balanceSignature = await createSignature(apiSecret, balanceQuery);
    
    const balanceResponse = await fetch(
      `${baseURL}/fapi/v2/balance?${balanceQuery}&signature=${balanceSignature}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      }
    );

    if (!balanceResponse.ok) {
      const errorData = await balanceResponse.json();
      throw new Error(`Binance API Error: ${JSON.stringify(errorData)}`);
    }

    const balanceData = await balanceResponse.json();
    const usdtBalance = balanceData.find((b: any) => b.asset === 'USDT');

    // 2. Buscar posições abertas
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

    // 3. Buscar PnL do dia (Income)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTime = startOfDay.getTime();

    const incomeQuery = `incomeType=REALIZED_PNL&startTime=${startTime}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const incomeSignature = await createSignature(apiSecret, incomeQuery);
    
    const incomeResponse = await fetch(
      `${baseURL}/fapi/v1/income?${incomeQuery}&signature=${incomeSignature}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      }
    );

    const incomeData = await incomeResponse.json();
    const todayPnL = incomeData.reduce((sum: number, item: any) => sum + parseFloat(item.income), 0);

    // Calcular PnL não realizado total
    const unrealizedPnL = openPositions.reduce((sum: number, p: any) => sum + parseFloat(p.unRealizedProfit), 0);

    // Buscar configurações de risco do usuário
    const { data: riskSettings } = await supabaseClient
      .from('risk_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const initialBalance = riskSettings?.initial_balance || parseFloat(usdtBalance?.availableBalance || '0');
    const todayPnLPercent = initialBalance > 0 ? (todayPnL / initialBalance) * 100 : 0;

    // Calcular risco de liquidação
    const criticalPositions = openPositions.filter((p: any) => {
      const marginRatio = parseFloat(p.marginRatio || '0');
      return marginRatio > 80;
    });

    const response = {
      balance: {
        total: usdtBalance?.balance || '0',
        available: usdtBalance?.availableBalance || '0',
        crossWallet: usdtBalance?.crossWalletBalance || '0',
      },
      pnl: {
        today: todayPnL.toFixed(2),
        todayPercent: todayPnLPercent.toFixed(2),
        unrealized: unrealizedPnL.toFixed(2),
      },
      positions: openPositions.map((p: any) => ({
        symbol: p.symbol,
        amount: p.positionAmt,
        entryPrice: p.entryPrice,
        markPrice: p.markPrice,
        unrealizedProfit: p.unRealizedProfit,
        liquidationPrice: p.liquidationPrice,
        leverage: p.leverage,
        marginRatio: p.marginRatio,
      })),
      risk: {
        hasCritical: criticalPositions.length > 0,
        criticalCount: criticalPositions.length,
        positions: criticalPositions.map((p: any) => ({
          symbol: p.symbol,
          marginRatio: p.marginRatio,
        })),
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in binance-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
