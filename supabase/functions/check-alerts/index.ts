import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

      // Send email notifications to admins
      try {
        console.log('Sending email notifications to admins...');
        
        // Get admin users
        const { data: adminRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (rolesError) {
          console.error('Error fetching admin roles:', rolesError);
        } else if (adminRoles && adminRoles.length > 0) {
          const adminIds = adminRoles.map(r => r.user_id);
          
          // Get admin emails from auth.users via profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('email')
            .in('id', adminIds);

          if (profilesError) {
            console.error('Error fetching admin emails:', profilesError);
          } else if (profiles && profiles.length > 0) {
            const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
            const adminEmails = profiles.map(p => p.email);

            // Create email content
            const alertsList = triggeredAlerts.map(alert => {
              const details = alert.details as any;
              return `• ${details.message}`;
            }).join('\n');

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">
                  ⚠️ Alertas Críticos Atingidos
                </h1>
                <p style="font-size: 16px; color: #333; margin: 20px 0;">
                  Os seguintes alertas críticos foram acionados no sistema:
                </p>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                  ${triggeredAlerts.map(alert => {
                    const details = alert.details as any;
                    return `<p style="margin: 10px 0; color: #333;"><strong>${details.message}</strong></p>`;
                  }).join('')}
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  Acesse o painel administrativo para mais detalhes e ações.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">
                  Esta é uma notificação automática do sistema NOTTIFY
                </p>
              </div>
            `;

            const { error: emailError } = await resend.emails.send({
              from: 'NOTTIFY Alertas <onboarding@resend.dev>',
              to: adminEmails,
              subject: `⚠️ ${triggeredAlerts.length} Alerta${triggeredAlerts.length > 1 ? 's' : ''} Crítico${triggeredAlerts.length > 1 ? 's' : ''} Acionado${triggeredAlerts.length > 1 ? 's' : ''}`,
              html: emailHtml,
            });

            if (emailError) {
              console.error('Error sending email:', emailError);
            } else {
              console.log(`Email notifications sent to ${adminEmails.length} admin(s)`);
            }
          }
        }
      } catch (emailErr) {
        console.error('Error in email notification process:', emailErr);
        // Don't throw error, just log it - we don't want to fail the whole function
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