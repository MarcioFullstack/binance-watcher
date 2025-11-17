import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Cliente para autenticação do usuário
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Cliente com privilégios de serviço para inserir histórico
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { risk_percent, risk_active } = await req.json();

    // Validação de entrada no servidor
    const riskPercentNum = parseFloat(risk_percent);
    
    if (isNaN(riskPercentNum)) {
      console.error('Invalid risk_percent: not a number');
      return new Response(
        JSON.stringify({ error: 'Percentual inválido: deve ser um número' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (riskPercentNum < 1) {
      console.error('Invalid risk_percent: below minimum');
      return new Response(
        JSON.stringify({ error: 'Percentual inválido: o mínimo é 1%' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (riskPercentNum > 50) {
      console.error('Invalid risk_percent: above maximum');
      return new Response(
        JSON.stringify({ error: 'Percentual inválido: o máximo é 50%' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof risk_active !== 'boolean') {
      console.error('Invalid risk_active: not a boolean');
      return new Response(
        JSON.stringify({ error: 'Status do alerta inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Saving alert config for user ${user.id}:`, { risk_percent: riskPercentNum, risk_active });

    // Buscar configurações atuais para comparar
    const { data: currentSettings, error: fetchError } = await supabaseClient
      .from('risk_settings')
      .select('risk_percent, risk_active')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching current settings:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configurações atuais' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar configurações
    const { error: updateError } = await supabaseClient
      .from('risk_settings')
      .update({
        risk_percent: riskPercentNum,
        risk_active: risk_active,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar configurações' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar mudanças no histórico usando o cliente admin
    const historyEntries = [];
    let shouldNotifyAdmins = false;

    // Verificar mudança no percentual
    if (currentSettings.risk_percent !== riskPercentNum) {
      historyEntries.push({
        user_id: user.id,
        alert_type: 'loss_alert',
        field_changed: 'threshold',
        old_value: currentSettings.risk_percent?.toString() || null,
        new_value: riskPercentNum.toString(),
        changed_by: user.id,
      });
    }

    // Verificar mudança no status de ativo
    if (currentSettings.risk_active !== risk_active) {
      historyEntries.push({
        user_id: user.id,
        alert_type: 'loss_alert',
        field_changed: 'enabled',
        old_value: currentSettings.risk_active?.toString() || null,
        new_value: risk_active.toString(),
        changed_by: user.id,
      });

      // Se está desabilitando o alerta, notificar admins
      if (currentSettings.risk_active === true && risk_active === false) {
        shouldNotifyAdmins = true;
      }
    }

    // Inserir histórico se houver mudanças
    if (historyEntries.length > 0) {
      const { error: historyError } = await supabaseAdmin
        .from('alert_config_history')
        .insert(historyEntries);

      if (historyError) {
        console.error('Error inserting history:', historyError);
        // Não falhar a operação se o histórico falhar, apenas logar
      } else {
        console.log(`Registered ${historyEntries.length} history entries`);
      }
    }

    // Notificar admins se alerta crítico foi desabilitado (background task)
    if (shouldNotifyAdmins) {
      console.log('Critical alert disabled, notifying admins...');
      
      // Buscar email do usuário
      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      // Enviar notificação em background sem bloquear a resposta (fire and forget)
      supabaseAdmin.functions.invoke('notify-admins-alert-disabled', {
        body: {
          user_id: user.id,
          user_email: userProfile?.email || 'unknown',
          alert_type: 'loss_alert',
          disabled_at: new Date().toISOString(),
        },
      }).then(({ error: notifyError }) => {
        if (notifyError) {
          console.error('Error notifying admins:', notifyError);
        } else {
          console.log('Admins notified successfully');
        }
      }).catch((err) => {
        console.error('Exception notifying admins:', err);
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Configurações salvas com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in save-alert-config function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});