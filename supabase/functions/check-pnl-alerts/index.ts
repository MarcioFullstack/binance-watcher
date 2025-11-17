import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskSettings {
  id: string;
  user_id: string;
  risk_percent: number;
  loss_push_notifications: boolean;
  gain_push_notifications: boolean;
}

interface BinanceData {
  balance: {
    total: string;
  };
  pnl: {
    today: string;
    todayPercent: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting PnL alerts check...');

    // Buscar todos os usuários com alertas ativos
    const { data: riskSettings, error: settingsError } = await supabase
      .from('risk_settings')
      .select('*')
      .or('loss_push_notifications.eq.true,gain_push_notifications.eq.true');

    if (settingsError) {
      console.error('Error fetching risk settings:', settingsError);
      throw settingsError;
    }

    console.log(`Found ${riskSettings?.length || 0} users with active alerts`);

    const alerts = [];

    for (const settings of riskSettings as RiskSettings[]) {
      try {
        console.log(`Checking alerts for user ${settings.user_id}`);

        // Buscar dados da Binance para o usuário
        const { data: binanceAccounts } = await supabase
          .from('binance_accounts')
          .select('*')
          .eq('user_id', settings.user_id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!binanceAccounts) {
          console.log(`No active Binance account for user ${settings.user_id}`);
          continue;
        }

        // Chamar a função binance-data
        const { data: binanceData, error: binanceError } = await supabase.functions.invoke('binance-data', {
          body: { userId: settings.user_id }
        });

        if (binanceError) {
          console.error(`Error fetching Binance data for user ${settings.user_id}:`, binanceError);
          continue;
        }

        const data = binanceData as BinanceData;
        const todayPercent = parseFloat(data.pnl.todayPercent);
        const threshold = settings.risk_percent;

        console.log(`User ${settings.user_id}: PnL ${todayPercent}%, Threshold ${threshold}%`);

        // Verificar alerta de perda crítica
        if (settings.loss_push_notifications && todayPercent <= -threshold) {
          // Verificar se já existe notificação hoje
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { data: existingNotification } = await supabase
            .from('notification_history')
            .select('id')
            .eq('user_id', settings.user_id)
            .eq('type', 'critical_loss')
            .gte('created_at', today.toISOString())
            .limit(1);

          if (!existingNotification || existingNotification.length === 0) {
            alerts.push({
              user_id: settings.user_id,
              type: 'critical_loss',
              title: '⚠️ Alerta de Perda Crítica',
              description: `Sua perda hoje atingiu ${todayPercent.toFixed(2)}%, ultrapassando o limite de ${threshold}%`,
              pnl_percent: todayPercent
            });
          }
        }

        // Verificar alerta de ganho
        if (settings.gain_push_notifications && todayPercent >= threshold) {
          // Verificar se já existe notificação hoje
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { data: existingNotification } = await supabase
            .from('notification_history')
            .select('id')
            .eq('user_id', settings.user_id)
            .eq('type', 'gain')
            .gte('created_at', today.toISOString())
            .limit(1);

          if (!existingNotification || existingNotification.length === 0) {
            alerts.push({
              user_id: settings.user_id,
              type: 'gain',
              title: '🎉 Alerta de Ganho',
              description: `Parabéns! Seu ganho hoje atingiu ${todayPercent.toFixed(2)}%, alcançando a meta de ${threshold}%`,
              pnl_percent: todayPercent
            });
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${settings.user_id}:`, userError);
        continue;
      }
    }

    // Salvar notificações no banco
    if (alerts.length > 0) {
      console.log(`Creating ${alerts.length} notifications`);

      for (const alert of alerts) {
        const { error: insertError } = await supabase
          .from('notification_history')
          .insert({
            user_id: alert.user_id,
            type: alert.type,
            title: alert.title,
            description: alert.description,
            is_read: false
          });

        if (insertError) {
          console.error('Error inserting notification:', insertError);
        } else {
          console.log(`Notification created for user ${alert.user_id}: ${alert.type}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: riskSettings?.length || 0,
        alerts_triggered: alerts.length,
        alerts: alerts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in check-pnl-alerts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
