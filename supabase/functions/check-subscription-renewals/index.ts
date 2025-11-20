import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for subscriptions that need renewal...');

    // Call the database function to create pending payments for auto-renew subscriptions
    const { error: renewError } = await supabase.rpc('check_auto_renew_subscriptions');

    if (renewError) {
      console.error('Error creating renewal payments:', renewError);
      throw renewError;
    }

    // Get subscriptions expiring within 7 days to send notifications
    const { data: expiringSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles!inner(email)
      `)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .lte('expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error('Error fetching expiring subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringSubscriptions?.length || 0} expiring subscriptions`);

    // Check for subscriptions expiring in exactly 24 hours (critical alert)
    const { data: criticalSubscriptions, error: criticalError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('expires_at', new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString())
      .lte('expires_at', new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString());

    if (criticalError) {
      console.error('Error fetching critical subscriptions:', criticalError);
    } else if (criticalSubscriptions && criticalSubscriptions.length > 0) {
      console.log(`Found ${criticalSubscriptions.length} subscriptions expiring in 24 hours`);

      // Send critical notifications for subscriptions expiring in 24 hours
      for (const subscription of criticalSubscriptions) {
        // Check if we already sent this notification today
        const { data: existingNotification } = await supabase
          .from('notification_history')
          .select('id')
          .eq('user_id', subscription.user_id)
          .eq('type', 'critical')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .like('title', '%24 horas%')
          .maybeSingle();

        if (!existingNotification) {
          await supabase.from('notification_history').insert({
            user_id: subscription.user_id,
            title: '⚠️ URGENTE: Assinatura expira em 24 horas!',
            description: `Sua assinatura ${subscription.plan_type === 'yearly' ? 'anual' : subscription.plan_type === 'quarterly' ? 'trimestral' : 'mensal'} expira em 24 horas. Renove AGORA para evitar interrupção do serviço!`,
            type: 'critical'
          });
          console.log(`Critical 24h notification sent to user ${subscription.user_id}`);
        }
      }
    }

    // Send notifications for expiring subscriptions
    if (expiringSubscriptions && expiringSubscriptions.length > 0) {
      for (const subscription of expiringSubscriptions) {
        const daysUntilExpiry = Math.ceil(
          (new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        let title = '';
        let description = '';
        let type = 'warning';

        if (subscription.auto_renew) {
          title = 'Renovação Automática Agendada';
          description = `Sua assinatura ${subscription.plan_type === 'yearly' ? 'anual' : subscription.plan_type === 'quarterly' ? 'trimestral' : 'mensal'} será renovada automaticamente em ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'}. Pagamento pendente criado.`;
          type = 'info';
        } else if (daysUntilExpiry <= 3) {
          title = 'Assinatura Expirando em Breve';
          description = `Sua assinatura expira em ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'}. Renove agora para continuar usando o NOTTIFY.`;
          type = 'warning';
        } else {
          title = 'Lembrete de Renovação';
          description = `Sua assinatura expira em ${daysUntilExpiry} dias. Não esqueça de renovar!`;
          type = 'info';
        }

        // Check if notification was already sent in the last 24 hours (to avoid duplicates)
        const { data: recentNotification } = await supabase
          .from('notification_history')
          .select('id')
          .eq('user_id', subscription.user_id)
          .eq('title', title)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!recentNotification) {
          // Insert notification
          await supabase.from('notification_history').insert({
            user_id: subscription.user_id,
            title,
            description,
            type
          });
        }
      }
    }

    // Check for expired subscriptions
    const { data: expiredSubscriptions, error: expiredError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (expiredError) {
      console.error('Error fetching expired subscriptions:', expiredError);
    } else if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

      // Update expired subscriptions to inactive
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ status: 'inactive' })
        .in('id', expiredSubscriptions.map(s => s.id));

      if (updateError) {
        console.error('Error updating expired subscriptions:', updateError);
      }

      // Send notifications
      for (const subscription of expiredSubscriptions) {
        await supabase.from('notification_history').insert({
          user_id: subscription.user_id,
          title: 'Assinatura Expirada',
          description: 'Sua assinatura expirou. Renove agora para continuar usando todos os recursos do NOTTIFY.',
          type: 'error'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription renewals checked successfully',
        expiringCount: expiringSubscriptions?.length || 0,
        expiredCount: expiredSubscriptions?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in check-subscription-renewals:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
