import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Sem autorização');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Não autenticado');
    }

    // Verificar se é admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Admin check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado: apenas administradores' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    const { code, days } = await req.json();

    // Validações
    if (!code || !days) {
      throw new Error('Código e dias são obrigatórios');
    }

    // Validar formato do código: XXXX-XXXX-XXXX-XXXX
    const voucherRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!voucherRegex.test(code)) {
      throw new Error('Formato inválido. Use: XXXX-XXXX-XXXX-XXXX');
    }

    // Validar dias
    const daysNumber = parseInt(days);
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      throw new Error('Dias deve ser entre 1 e 365');
    }

    // Verificar se código já existe
    const { data: existingVoucher } = await supabase
      .from('vouchers')
      .select('code')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (existingVoucher) {
      throw new Error('Este código de voucher já existe');
    }

    // Usar service role para inserir o voucher (bypass RLS)
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: newVoucher, error: insertError } = await supabaseServiceRole
      .from('vouchers')
      .insert({
        code: code.toUpperCase(),
        days: daysNumber,
        is_used: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Erro ao criar voucher');
    }

    console.log('Voucher created successfully:', newVoucher.code);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Voucher criado com sucesso!',
        voucher: newVoucher
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in create-voucher function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
