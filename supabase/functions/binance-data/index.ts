import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple cache to reduce Binance API calls
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 8000; // 8 seconds cache to avoid rate limits

// Clean expired cache entries every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 30000);

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

    // Check cache first to avoid rate limits
    const cacheKey = `binance_data_${user.id}`;
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('Returning cached data for user:', user.id);
      return new Response(
        JSON.stringify(cached.data),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    // Decrypt API credentials
    let apiKey: string;
    let apiSecret: string;
    
    try {
      apiKey = await decrypt(accounts.api_key);
      apiSecret = await decrypt(accounts.api_secret);
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

    const totalBalance = parseFloat(usdtBalance?.balance || '0');
    const availableBalance = parseFloat(usdtBalance?.availableBalance || '0');
    const crossWalletBalance = parseFloat(usdtBalance?.crossWalletBalance || '0');
    
    // Saldo usado em posições
    const usedBalance = crossWalletBalance - availableBalance;

    // Calcular baseado no initial_balance se configurado
    const initialBalance = riskSettings?.initial_balance || totalBalance;
    const riskPercent = riskSettings?.risk_percent || 10;
    const maxAllowedLoss = initialBalance * (riskPercent / 100);
    
    // PnL real desde o saldo inicial
    const totalPnLFromInitial = totalBalance - initialBalance;
    const totalPnLPercent = initialBalance > 0 ? (totalPnLFromInitial / initialBalance) * 100 : 0;
    
    // PnL do dia como porcentagem do saldo inicial
    const todayPnLPercent = initialBalance > 0 ? (todayPnL / initialBalance) * 100 : 0;
    
    // Verificar se atingiu limite de perda
    const hasReachedRiskLimit = totalPnLFromInitial <= -maxAllowedLoss;
    const riskLimitPercent = initialBalance > 0 ? (Math.abs(totalPnLFromInitial) / initialBalance) * 100 : 0;

    // Calcular risco de liquidação
    const criticalPositions = openPositions.filter((p: any) => {
      const marginRatio = parseFloat(p.marginRatio || '0');
      return marginRatio > 80;
    });

    // PnL do dia inclui realizado + não realizado
    const todayTotalPnL = todayPnL + unrealizedPnL;
    const todayTotalPercent = initialBalance > 0 ? (todayTotalPnL / initialBalance) * 100 : 0;

    // Sistema de alertas progressivos de risco
    const checkAndSendRiskAlert = async (thresholdPercent: number, title: string, emoji: string) => {
      // Verificar se já enviou alerta deste tipo recentemente (última hora)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentAlert } = await supabaseClient
        .from('notification_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'risk_warning')
        .eq('title', title)
        .gte('created_at', oneHourAgo)
        .maybeSingle();

      // Se não há alerta recente, criar novo
      if (!recentAlert && riskLimitPercent >= thresholdPercent) {
        console.log(`${emoji} Risk alert ${thresholdPercent}% for user ${user.id}: ${riskLimitPercent.toFixed(2)}% loss`);
        
        await supabaseClient
          .from('notification_history')
          .insert({
            user_id: user.id,
            type: 'risk_warning',
            title,
            description: `Você atingiu ${riskLimitPercent.toFixed(2)}% de perda do saldo inicial (${initialBalance.toFixed(2)} USDT). Limite configurado: ${riskPercent}%. Saldo atual: ${totalBalance.toFixed(2)} USDT. ${thresholdPercent >= 100 ? 'Considere fechar suas posições imediatamente!' : 'Monitore suas posições de perto.'}`,
          });
      }
    };

    // Enviar alertas progressivos baseados no limite configurado
    if (riskLimitPercent >= 70) {
      await checkAndSendRiskAlert(70, '⚠️ ALERTA: 70% do Limite de Risco', '⚠️');
    }
    
    if (riskLimitPercent >= 85) {
      await checkAndSendRiskAlert(85, '🔴 ATENÇÃO: 85% do Limite de Risco', '🔴');
    }
    
    if (riskLimitPercent >= 95) {
      await checkAndSendRiskAlert(95, '🚨 CRÍTICO: 95% do Limite de Risco', '🚨');
    }
    
    if (hasReachedRiskLimit) {
      await checkAndSendRiskAlert(100, '🚨 LIMITE DE RISCO ATINGIDO', '🚨');
    }

    // Verificar alertas de PnL configurados pelo usuário
    try {
      console.log('Checking PnL alerts for user:', user.id);
      
      // Use service role client to properly invoke the function
      const serviceRoleClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const authHeader = req.headers.get('Authorization');
      const { data: alertData, error: alertError } = await serviceRoleClient.functions.invoke('check-pnl-alerts', {
        headers: {
          Authorization: authHeader || '',
        },
        body: {
          pnlData: {
            today: todayTotalPnL,
            todayPercent: todayTotalPercent,
            unrealized: unrealizedPnL,
            totalFromInitial: totalPnLFromInitial,
            totalPercent: totalPnLPercent,
          },
        },
      });
      
      if (alertError) {
        console.error('Error invoking PnL alerts:', alertError);
      } else {
        console.log('PnL alerts checked successfully:', alertData);
      }
    } catch (alertError) {
      console.error('Exception checking PnL alerts:', alertError);
      // Não lançar erro para não interromper o fluxo principal
    }

    const response = {
      balance: {
        total: totalBalance.toFixed(2),
        available: availableBalance.toFixed(2),
        crossWallet: crossWalletBalance.toFixed(2),
        used: usedBalance.toFixed(2),
        initial: initialBalance.toFixed(2),
      },
      pnl: {
        today: todayTotalPnL.toFixed(2),
        todayPercent: todayTotalPercent.toFixed(2),
        realized: todayPnL.toFixed(2),
        unrealized: unrealizedPnL.toFixed(2),
        totalFromInitial: totalPnLFromInitial.toFixed(2),
        totalPercent: totalPnLPercent.toFixed(2),
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
        hasReachedLimit: hasReachedRiskLimit,
        riskPercent: riskPercent,
        maxAllowedLoss: maxAllowedLoss.toFixed(2),
        currentLoss: Math.abs(totalPnLFromInitial).toFixed(2),
        riskLimitPercent: riskLimitPercent.toFixed(2),
      },
    };

    // Update cache before returning
    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    console.log('Updated cache for user:', user.id);

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
