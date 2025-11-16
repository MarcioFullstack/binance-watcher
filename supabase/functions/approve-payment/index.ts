import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // Verificar se é admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Acesso negado: apenas administradores');
    }

    const { payment_id, action } = await req.json();

    if (!payment_id || !action) {
      throw new Error('payment_id e action são obrigatórios');
    }

    // Buscar pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('pending_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error('Pagamento não encontrado');
    }

    if (action === 'approve') {
      // Aprovar pagamento e ativar assinatura
      console.log('Approving payment:', payment_id);

      // Calcular data de expiração (30 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Verificar se já existe assinatura
      const { data: existingSub } = await supabaseClient
        .from('subscriptions')
        .select('id')
        .eq('user_id', payment.user_id)
        .maybeSingle();

      let subError;
      
      if (existingSub) {
        // Atualizar assinatura existente
        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            status: 'active',
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', payment.user_id);
        subError = error;
      } else {
        // Criar nova assinatura
        const { error } = await supabaseClient
          .from('subscriptions')
          .insert({
            user_id: payment.user_id,
            status: 'active',
            expires_at: expiresAt.toISOString(),
          });
        subError = error;
      }

      if (subError) {
        console.error('Subscription error:', subError);
        throw new Error('Erro ao ativar assinatura');
      }

      // Atualizar status do pagamento
      const { error: updateError } = await supabaseClient
        .from('pending_payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', payment_id);

      if (updateError) {
        throw new Error('Erro ao atualizar pagamento');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pagamento aprovado e assinatura ativada',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'reject') {
      // Rejeitar pagamento
      console.log('Rejecting payment:', payment_id);

      const { error: updateError } = await supabaseClient
        .from('pending_payments')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', payment_id);

      if (updateError) {
        throw new Error('Erro ao rejeitar pagamento');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pagamento rejeitado',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Ação inválida: use "approve" ou "reject"');
    }

  } catch (error: any) {
    console.error('Error in approve-payment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
