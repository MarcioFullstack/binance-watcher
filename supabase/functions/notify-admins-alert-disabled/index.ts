import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  user_email: string;
  alert_type: string;
  disabled_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Cliente admin para buscar emails dos admins
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, user_email, alert_type, disabled_at }: NotificationRequest = await req.json();

    console.log(`Notifying admins about alert disabled by user ${user_id}`);

    // Buscar todos os admins
    const { data: adminRoles, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admin roles:', adminError);
      throw adminError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admins found to notify');
      return new Response(
        JSON.stringify({ success: true, message: 'No admins to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar emails dos admins
    const adminUserIds = adminRoles.map(role => role.user_id);
    const { data: adminProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .in('id', adminUserIds);

    if (profilesError) {
      console.error('Error fetching admin profiles:', profilesError);
      throw profilesError;
    }

    const adminEmails = adminProfiles?.map(profile => profile.email) || [];

    if (adminEmails.length === 0) {
      console.log('No admin emails found');
      return new Response(
        JSON.stringify({ success: true, message: 'No admin emails found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending notification to ${adminEmails.length} admins`);

    // Formatar tipo de alerta
    const alertTypeName = alert_type === 'loss_alert' ? 'Alerta de Perda' : 'Alerta de Ganho';
    const alertIcon = alert_type === 'loss_alert' ? '⚠️' : '🎯';

    // Criar HTML do email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .alert-box { background: white; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${alertIcon} Alerta Crítico Desabilitado</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <h2 style="margin-top: 0; color: #ef4444;">⚠️ Atenção: Configuração Crítica Alterada</h2>
        <p>Um usuário desabilitou um alerta crítico de proteção no sistema NOTTIFY.</p>
        
        <div class="info-row">
          <span class="label">Tipo de Alerta:</span>
          <span class="value">${alertTypeName}</span>
        </div>
        <div class="info-row">
          <span class="label">Usuário:</span>
          <span class="value">${user_email}</span>
        </div>
        <div class="info-row">
          <span class="label">ID do Usuário:</span>
          <span class="value">${user_id}</span>
        </div>
        <div class="info-row">
          <span class="label">Data/Hora:</span>
          <span class="value">${new Date(disabled_at).toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div class="warning">
        <strong>⚠️ Impactos da Desabilitação:</strong>
        <ul>
          <li>O usuário não receberá notificações de limite de perda</li>
          <li>Risco aumentado de perda de capital sem aviso prévio</li>
          <li>Possível necessidade de intervenção administrativa</li>
        </ul>
      </div>

      <p><strong>Ação Recomendada:</strong></p>
      <p>Considere entrar em contato com o usuário para verificar se esta foi uma ação intencional e avaliar se há necessidade de assistência.</p>

      <a href="${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/admin" class="button">
        Acessar Painel Administrativo
      </a>
    </div>
    <div class="footer">
      <p>Esta é uma notificação automática do sistema NOTTIFY.</p>
      <p>Você está recebendo este email porque é um administrador do sistema.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar email para todos os admins
    const emailPromises = adminEmails.map(async (email) => {
      try {
        const { error } = await resend.emails.send({
          from: 'NOTTIFY Alerts <onboarding@resend.dev>',
          to: [email],
          subject: `⚠️ Alerta Crítico Desabilitado - ${user_email}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending email to ${email}:`, error);
          return { email, success: false, error };
        }

        console.log(`Email sent successfully to ${email}`);
        return { email, success: true };
      } catch (error) {
        console.error(`Exception sending email to ${email}:`, error);
        return { email, success: false, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Notification complete: ${successCount}/${adminEmails.length} emails sent successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notificação enviada para ${successCount} administrador(es)`,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in notify-admins-alert-disabled function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});