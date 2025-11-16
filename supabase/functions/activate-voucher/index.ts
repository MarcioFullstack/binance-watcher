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

    const { code } = await req.json();

    if (!code) {
      throw new Error('Código do voucher é obrigatório');
    }

    // Buscar voucher
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select('*')
      .eq('code', code)
      .single();

    if (voucherError || !voucher) {
      throw new Error('Voucher inválido');
    }

    if (voucher.is_used) {
      throw new Error('Este voucher já foi utilizado');
    }

    // Marcar voucher como usado
    const { error: updateVoucherError } = await supabaseClient
      .from('vouchers')
      .update({
        is_used: true,
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('code', code);

    if (updateVoucherError) {
      throw new Error('Erro ao ativar voucher');
    }

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + voucher.days);

    // Atualizar assinatura do usuário
    const { error: subError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (subError) {
      throw new Error('Erro ao ativar assinatura');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Voucher ativado com sucesso! ${voucher.days} dias de acesso.`,
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in activate-voucher function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
