import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAuditLog } from "../_shared/audit-log.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting voucher invalidation...');
    
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

    // Verificar se é admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      console.error('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error_code: 'NOT_ADMIN' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Admin authenticated:', user.id);

    const { voucherId } = await req.json();

    if (!voucherId) {
      console.error('Invalid voucher ID provided:', voucherId);
      return new Response(
        JSON.stringify({ error_code: 'VOUCHER_ID_REQUIRED' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Attempting to invalidate voucher:', voucherId);

    // Buscar voucher
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select('*')
      .eq('id', voucherId)
      .single();

    if (voucherError || !voucher) {
      console.error('Error fetching voucher:', voucherError);
      return new Response(
        JSON.stringify({ error_code: 'VOUCHER_NOT_FOUND' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (voucher.is_used) {
      console.error('Voucher already used:', voucherId);
      return new Response(
        JSON.stringify({ error_code: 'VOUCHER_ALREADY_USED' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Voucher found and valid, invalidating...');

    // Invalidar voucher (marcar como usado por admin)
    const { error: updateError } = await supabaseClient
      .from('vouchers')
      .update({
        is_used: true,
        used_by: null, // Admin invalidation, sem usuário
        used_at: new Date().toISOString(),
      })
      .eq('id', voucherId);

    if (updateError) {
      console.error('Error invalidating voucher:', updateError);
      return new Response(
        JSON.stringify({ error_code: 'UPDATE_ERROR' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Voucher invalidated successfully:', voucherId);

    // Registrar log de auditoria
    await createAuditLog({
      userId: user.id,
      action: 'INVALIDATE_VOUCHER',
      entityType: 'voucher',
      entityId: voucherId,
      details: {
        code: voucher.code,
        days: voucher.days,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      userAgent: req.headers.get('user-agent') || '',
    });

    return new Response(
      JSON.stringify({
        success: true,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Unexpected error in invalidate-voucher function:', error);
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
