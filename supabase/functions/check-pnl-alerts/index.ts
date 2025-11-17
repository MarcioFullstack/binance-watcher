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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, pnlData } = await req.json() as { userId: string; pnlData: PnLData };

    console.log(`Checking PnL alerts for user: ${userId}`);

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
        console.log(`🚨 Alert triggered: ${alert.alert_type} - ${alert.trigger_type}`);
        
        const notificationType = alert.alert_type === 'loss' ? 'pnl_loss_alert' : 'pnl_gain_alert';
        const title = alert.alert_type === 'loss' ? `🔴 Alerta de Perda` : `🟢 Alerta de Ganho`;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentNotif } = await supabaseClient
          .from('notification_history')
          .select('id')
          .eq('user_id', userId)
          .eq('type', notificationType)
          .gte('created_at', oneHourAgo)
          .ilike('description', `%${alert.trigger_type}%`)
          .limit(1);

        if (!recentNotif || recentNotif.length === 0) {
          const { error: notifError } = await supabaseClient
            .from('notification_history')
            .insert({
              user_id: userId,
              type: notificationType,
              title,
              description,
            });

          if (!notifError) {
            triggeredAlerts.push({
              type: alert.trigger_type,
              alertType: alert.alert_type,
              currentValue,
              threshold: alert.threshold,
              soundEnabled: alert.sound_enabled,
              pushEnabled: alert.push_enabled,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ triggeredAlerts, message: `${triggeredAlerts.length} alert(s) triggered` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
