import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PnLData {
  today: number;
  todayPercent: number;
  unrealized: number;
  totalFromInitial: number;
  totalPercent: number;
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Unauthorized in check-pnl-alerts: missing or invalid user.', {
        hasAuthError: !!authError,
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const userId = user.id;
    console.log(`Checking PnL alerts for user: ${userId}`);

    // Get pnlData from request body (optional - if not provided, fetch from binance-data)
    const body = await req.json().catch(() => ({}));
    let pnlData: PnLData | undefined = body.pnlData;

    // If no pnlData provided, fetch current data from binance-data
    if (!pnlData) {
      console.log('No PnL data provided, fetching from binance-data...');
      const { data: binanceData, error: binanceError } = await supabaseClient.functions.invoke('binance-data');
      
      if (binanceError) {
        console.error('Error fetching binance data:', binanceError);
        throw new Error('Could not fetch current PnL data');
      }

      pnlData = binanceData?.pnl;
      if (!pnlData) {
        throw new Error('No PnL data available');
      }
    }

    // Buscar alertas configurados e ativos do usuário
    const { data: alerts, error: alertsError } = await supabaseClient
      .from('pnl_alert_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      throw alertsError;
    }

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active alerts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const triggeredAlerts = [];

    // Verificar cada alerta
    for (const alert of alerts) {
      let shouldTrigger = false;
      let currentValue = 0;
      let description = '';

      switch (alert.trigger_type) {
        case 'daily_usdt':
          if (alert.alert_type === 'loss') {
            currentValue = Math.abs(pnlData.today);
            shouldTrigger = pnlData.today < 0 && currentValue >= alert.threshold;
            description = `Perda diária de ${currentValue.toFixed(2)} USDT (limite: ${alert.threshold} USDT)`;
          } else {
            currentValue = pnlData.today;
            shouldTrigger = pnlData.today > 0 && currentValue >= alert.threshold;
            description = `Ganho diário de ${currentValue.toFixed(2)} USDT (meta: ${alert.threshold} USDT)`;
          }
          break;

        case 'daily_percent':
          if (alert.alert_type === 'loss') {
            currentValue = Math.abs(pnlData.todayPercent);
            shouldTrigger = pnlData.todayPercent < 0 && currentValue >= alert.threshold;
            description = `Perda diária de ${currentValue.toFixed(2)}% (limite: ${alert.threshold}%)`;
          } else {
            currentValue = pnlData.todayPercent;
            shouldTrigger = pnlData.todayPercent > 0 && currentValue >= alert.threshold;
            description = `Ganho diário de ${currentValue.toFixed(2)}% (meta: ${alert.threshold}%)`;
          }
          break;

        case 'total_usdt':
          if (alert.alert_type === 'loss') {
            currentValue = Math.abs(pnlData.totalFromInitial);
            shouldTrigger = pnlData.totalFromInitial < 0 && currentValue >= alert.threshold;
            description = `Perda total de ${currentValue.toFixed(2)} USDT (limite: ${alert.threshold} USDT)`;
          } else {
            currentValue = pnlData.totalFromInitial;
            shouldTrigger = pnlData.totalFromInitial > 0 && currentValue >= alert.threshold;
            description = `Ganho total de ${currentValue.toFixed(2)} USDT (meta: ${alert.threshold} USDT)`;
          }
          break;

        case 'total_percent':
          if (alert.alert_type === 'loss') {
            currentValue = Math.abs(pnlData.totalPercent);
            shouldTrigger = pnlData.totalPercent < 0 && currentValue >= alert.threshold;
            description = `Perda total de ${currentValue.toFixed(2)}% (limite: ${alert.threshold}%)`;
          } else {
            currentValue = pnlData.totalPercent;
            shouldTrigger = pnlData.totalPercent > 0 && currentValue >= alert.threshold;
            description = `Ganho total de ${currentValue.toFixed(2)}% (meta: ${alert.threshold}%)`;
          }
          break;

        case 'unrealized_usdt':
          if (alert.alert_type === 'loss') {
            currentValue = Math.abs(pnlData.unrealized);
            shouldTrigger = pnlData.unrealized < 0 && currentValue >= alert.threshold;
            description = `PnL não realizado negativo de ${currentValue.toFixed(2)} USDT (limite: ${alert.threshold} USDT)`;
          } else {
            currentValue = pnlData.unrealized;
            shouldTrigger = pnlData.unrealized > 0 && currentValue >= alert.threshold;
            description = `PnL não realizado positivo de ${currentValue.toFixed(2)} USDT (meta: ${alert.threshold} USDT)`;
          }
          break;
      }

      if (shouldTrigger) {
        triggeredAlerts.push({
          config: alert,
          value: currentValue,
          description,
        });
      }
    }

    // Salvar notificações e enviar push se houver alertas disparados
    if (triggeredAlerts.length > 0) {
      const supabaseServiceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      for (const alertData of triggeredAlerts) {
        const alert = alertData.config;
        const notificationTitle = alert.alert_type === 'loss' 
          ? `⚠️ Alerta de Perda - ${alert.trigger_type}`
          : `✅ Meta Atingida - ${alert.trigger_type}`;

        // Check if similar alert was sent in last hour to avoid spam
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentNotif } = await supabaseServiceClient
          .from('notification_history')
          .select('id')
          .eq('user_id', userId)
          .eq('type', alert.alert_type === 'loss' ? 'pnl_loss_alert' : 'pnl_gain_alert')
          .gte('created_at', oneHourAgo)
          .ilike('description', `%${alert.trigger_type}%`)
          .limit(1);

        if (!recentNotif || recentNotif.length === 0) {
          await supabaseServiceClient.from('notification_history').insert({
            user_id: userId,
            title: notificationTitle,
            description: alertData.description,
            type: alert.alert_type === 'loss' ? 'warning' : 'success',
          });

          console.log(`Alert triggered: ${notificationTitle} - ${alertData.description}`);
        } else {
          console.log(`Skipping duplicate alert for ${alert.trigger_type}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: alerts.length,
        alerts_triggered: triggeredAlerts.length,
        alerts: triggeredAlerts.map(a => ({
          title: a.config.alert_type === 'loss' 
            ? `⚠️ Alerta de Perda - ${a.config.trigger_type}`
            : `✅ Meta Atingida - ${a.config.trigger_type}`,
          description: a.description,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error checking PnL alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
