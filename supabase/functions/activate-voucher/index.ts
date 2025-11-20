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
        JSON.stringify({ error_code: 'NOT_AUTHENTICATED' }),
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
        JSON.stringify({ error_code: 'INVALID_SESSION' }),
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
        JSON.stringify({ error_code: 'CODE_REQUIRED' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar formato: aceita XXXX-XXXX-XXXX-XXXX ou códigos personalizados (10-30 caracteres alfanuméricos com hífens)
    const trimmedCode = code.trim().toUpperCase();
    
    if (trimmedCode.length < 10 || trimmedCode.length > 30) {
      console.error('Voucher code length invalid:', trimmedCode.length);
      return new Response(
        JSON.stringify({ error_code: 'INVALID_CODE_LENGTH' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar caracteres permitidos (A-Z, 0-9, hífens)
    if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
      console.error('Voucher code contains invalid characters:', trimmedCode);
      return new Response(
        JSON.stringify({ error_code: 'INVALID_CHARACTERS' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Attempting to activate voucher:', trimmedCode);

    // Usar service role para buscar voucher (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar voucher com service role
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('code', trimmedCode)
      .single();

    if (voucherError || !voucher) {
      console.error('Error fetching voucher:', voucherError, 'Code:', trimmedCode);
      return new Response(
        JSON.stringify({ error_code: 'VOUCHER_NOT_FOUND' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (voucher.is_used) {
      console.error('Voucher already used:', trimmedCode);
      return new Response(
        JSON.stringify({ error_code: 'VOUCHER_ALREADY_USED' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Voucher found and valid, marking as used...');

    // Marcar voucher como usado (usar service role)
    const { error: updateVoucherError } = await supabaseAdmin
      .from('vouchers')
      .update({
        is_used: true,
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('code', trimmedCode);

    if (updateVoucherError) {
      console.error('Error updating voucher:', updateVoucherError);
      return new Response(
        JSON.stringify({ error_code: 'UPDATE_VOUCHER_ERROR' }),
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
        JSON.stringify({ error_code: 'SUBSCRIPTION_ERROR' }),
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
        days: voucher.days,
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
        error_code: 'UNEXPECTED_ERROR'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
