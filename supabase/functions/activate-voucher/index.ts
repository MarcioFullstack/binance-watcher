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
    console.log('Starting voucher activation...');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autenticado. Faça login novamente.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Sessão inválida. Faça login novamente.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User authenticated:', user.id);

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      console.error('Invalid voucher code provided:', code);
      return new Response(
        JSON.stringify({ error: 'Código do voucher é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Attempting to activate voucher:', code);

    // Buscar voucher
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (voucherError) {
      console.error('Error fetching voucher:', voucherError);
      return new Response(
        JSON.stringify({ error: 'Voucher não encontrado ou inválido' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!voucher) {
      console.error('Voucher not found:', code);
      return new Response(
        JSON.stringify({ error: 'Voucher não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (voucher.is_used) {
      console.error('Voucher already used:', code);
      return new Response(
        JSON.stringify({ error: 'Este voucher já foi utilizado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Voucher found and valid, marking as used...');

    // Marcar voucher como usado
    const { error: updateVoucherError } = await supabaseClient
      .from('vouchers')
      .update({
        is_used: true,
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('code', code.trim().toUpperCase());

    if (updateVoucherError) {
      console.error('Error updating voucher:', updateVoucherError);
      return new Response(
        JSON.stringify({ error: 'Erro ao marcar voucher como usado' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Voucher marked as used, creating/updating subscription...');

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + voucher.days);

    // Verificar se já existe assinatura
    const { data: existingSub } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
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
        .eq('user_id', user.id);
      subError = error;
    } else {
      // Criar nova assinatura
      const { error } = await supabaseClient
        .from('subscriptions')
        .insert({
          user_id: user.id,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        });
      subError = error;
    }

    if (subError) {
      console.error('Subscription error:', subError);
      return new Response(
        JSON.stringify({ error: 'Erro ao ativar assinatura. Contate o suporte.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Subscription activated successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Voucher ativado com sucesso! ${voucher.days} dias de acesso.`,
        expiresAt: expiresAt.toISOString(),
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Unexpected error in activate-voucher function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro inesperado ao ativar voucher. Tente novamente.' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
