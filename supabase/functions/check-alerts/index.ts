import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  id: string;
  alert_type: 'vouchers_per_day' | 'payment_rejection_rate' | 'high_payment_volume';
  threshold: number;
  enabled: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting alert check...');

    // Get enabled alert configs
    const { data: configs, error: configError } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('enabled', true);

    if (configError) {
      console.error('Error fetching alert configs:', configError);
      throw configError;
    }

    console.log('Found configs:', configs);

    const triggeredAlerts = [];
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    for (const config of configs as AlertConfig[]) {
      console.log(`Checking alert type: ${config.alert_type}`);

      if (config.alert_type === 'vouchers_per_day') {
        // Check vouchers created today from audit logs
        const { data: auditLogs, error: auditError } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('action', 'CREATE_VOUCHER')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

        if (auditError) {
          console.error('Error fetching audit logs:', auditError);
          continue;
        }

        const voucherCount = auditLogs?.length || 0;
        console.log(`Vouchers created today: ${voucherCount}, threshold: ${config.threshold}`);

        if (voucherCount > config.threshold) {
          // Check if alert already exists for today
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('*')
            .eq('alert_config_id', config.id)
            .gte('triggered_at', startOfDay)
            .lte('triggered_at', endOfDay)
            .eq('is_resolved', false)
            .single();

          if (!existingAlert) {
            triggeredAlerts.push({
              alert_config_id: config.id,
              details: {
                type: 'vouchers_per_day',
                count: voucherCount,
                threshold: config.threshold,
                message: `${voucherCount} vouchers criados hoje, limite de ${config.threshold} excedido`
              }
            });
          }
        }
      }

      if (config.alert_type === 'payment_rejection_rate') {
        // Check payment rejection rate from audit logs
        const { data: paymentActions, error: paymentError } = await supabase
          .from('audit_logs')
          .select('*')
          .in('action', ['APPROVE_PAYMENT', 'REJECT_PAYMENT'])
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

        if (paymentError) {
          console.error('Error fetching payment actions:', paymentError);
          continue;
        }

        const totalPayments = paymentActions?.length || 0;
        const rejectedPayments = paymentActions?.filter(a => a.action === 'REJECT_PAYMENT').length || 0;
        const rejectionRate = totalPayments > 0 ? (rejectedPayments / totalPayments) * 100 : 0;

        console.log(`Rejection rate: ${rejectionRate}%, threshold: ${config.threshold}%`);

        if (rejectionRate > config.threshold && totalPayments > 0) {
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('*')
            .eq('alert_config_id', config.id)
            .gte('triggered_at', startOfDay)
            .lte('triggered_at', endOfDay)
            .eq('is_resolved', false)
            .single();

          if (!existingAlert) {
            triggeredAlerts.push({
              alert_config_id: config.id,
              details: {
                type: 'payment_rejection_rate',
                rejectionRate: rejectionRate.toFixed(2),
                threshold: config.threshold,
                totalPayments,
                rejectedPayments,
                message: `Taxa de rejeição de ${rejectionRate.toFixed(2)}% (${rejectedPayments}/${totalPayments}), limite de ${config.threshold}% excedido`
              }
            });
          }
        }
      }

      if (config.alert_type === 'high_payment_volume') {
        // Check high payment volume from pending_payments
        const { data: payments, error: paymentsError } = await supabase
          .from('pending_payments')
          .select('*')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
          continue;
        }

        const paymentCount = payments?.length || 0;
        console.log(`Payments today: ${paymentCount}, threshold: ${config.threshold}`);

        if (paymentCount > config.threshold) {
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('*')
            .eq('alert_config_id', config.id)
            .gte('triggered_at', startOfDay)
            .lte('triggered_at', endOfDay)
            .eq('is_resolved', false)
            .single();

          if (!existingAlert) {
            triggeredAlerts.push({
              alert_config_id: config.id,
              details: {
                type: 'high_payment_volume',
                count: paymentCount,
                threshold: config.threshold,
                message: `${paymentCount} pagamentos registrados hoje, limite de ${config.threshold} excedido`
              }
            });
          }
        }
      }
    }

    // Insert triggered alerts
    if (triggeredAlerts.length > 0) {
      console.log('Inserting alerts:', triggeredAlerts);
      const { error: insertError } = await supabase
        .from('alerts')
        .insert(triggeredAlerts);

      if (insertError) {
        console.error('Error inserting alerts:', insertError);
        throw insertError;
      }
    }

    console.log(`Alert check completed. ${triggeredAlerts.length} new alerts triggered.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsTriggered: triggeredAlerts.length,
        message: `Verificação concluída. ${triggeredAlerts.length} alertas disparados.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in check-alerts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});