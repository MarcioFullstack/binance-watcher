import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAuditLog } from "../_shared/audit-log.ts";

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

    const { code, days, maxUses } = await req.json();

    // Validações
    if (!code || !days) {
      throw new Error('Código e dias são obrigatórios');
    }

    // Validar maxUses se fornecido
    let maxUsesNumber = null;
    if (maxUses !== undefined && maxUses !== null) {
      maxUsesNumber = parseInt(maxUses);
      if (isNaN(maxUsesNumber) || maxUsesNumber < 2 || maxUsesNumber > 10000) {
        throw new Error('Número máximo de usos deve ser entre 2 e 10000');
      }
    }

    // Validar formato do código: aceita códigos alfanuméricos com hífens (5-30 caracteres)
    const codeUpper = code.toUpperCase();
    
    if (codeUpper.length < 5 || codeUpper.length > 30) {
      throw new Error('Código deve ter entre 5 e 30 caracteres');
    }
    
    if (!/^[A-Z0-9-]+$/.test(codeUpper)) {
      throw new Error('Código deve conter apenas letras maiúsculas, números e hífens');
    }

    // Validar dias - aceitar 1 a 3650 (10 anos)
    const daysNumber = parseInt(days);
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 3650) {
      throw new Error('Dias deve ser entre 1 e 3650');
    }

    // Verificar se código já existe
    const { data: existingVoucher } = await supabase
      .from('vouchers')
      .select('code')
      .eq('code', codeUpper)
      .maybeSingle();

    if (existingVoucher) {
      throw new Error('Este código de voucher já existe');
    }

    // Usar service role para inserir o voucher (bypass RLS)
    console.log('🔐 Usando service role para criar voucher no banco...');
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: newVoucher, error: insertError } = await supabaseServiceRole
      .from('vouchers')
      .insert({
        code: codeUpper,
        days: daysNumber,
        is_used: false,
        max_uses: maxUsesNumber,
        current_uses: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌❌❌ ERRO CRÍTICO ao inserir voucher no banco:', {
        error: insertError,
        code: codeUpper,
        days: daysNumber,
        maxUses: maxUsesNumber,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw new Error('Erro ao criar voucher no banco: ' + insertError.message);
    }

    console.log('✅✅✅ Voucher criado e salvo com sucesso no banco:', {
      code: newVoucher.code,
      days: daysNumber,
      maxUses: maxUsesNumber,
      id: newVoucher.id,
      created_at: newVoucher.created_at
    });

    // VALIDAÇÃO CRÍTICA: Verificar se o voucher foi REALMENTE salvo
    console.log('🔍 Verificando se voucher foi persistido no banco...');
    const { data: verifyVoucher, error: verifyError } = await supabaseServiceRole
      .from('vouchers')
      .select('*')
      .eq('code', codeUpper)
      .maybeSingle();

    if (verifyError || !verifyVoucher) {
      console.error('❌❌❌ ERRO CRÍTICO: Voucher não foi encontrado após inserção!', {
        code: codeUpper,
        verifyError
      });
      throw new Error('Voucher não foi persistido corretamente no banco de dados');
    }

    console.log('✅ Voucher validado e confirmado no banco:', verifyVoucher);

    // Registrar log de auditoria
    await createAuditLog({
      userId: user.id,
      action: 'CREATE_VOUCHER',
      entityType: 'voucher',
      entityId: newVoucher.id,
      details: {
        code: newVoucher.code,
        days: daysNumber,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      userAgent: req.headers.get('user-agent') || '',
    });

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
