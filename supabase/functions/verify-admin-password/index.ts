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

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Access denied: only administrators');
    }

    const { password } = await req.json();
    
    if (!password) {
      throw new Error('Password is required');
    }

    // Get the admin panel password from environment
    const ADMIN_PANEL_PASSWORD = Deno.env.get('ADMIN_PANEL_PASSWORD');
    
    if (!ADMIN_PANEL_PASSWORD) {
      throw new Error('Admin panel password not configured');
    }

    // Verify password
    const isValid = password === ADMIN_PANEL_PASSWORD;

    if (!isValid) {
      // Log failed attempt
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'admin_panel_access_denied',
        entity_type: 'admin_panel',
        details: { reason: 'Invalid password' },
      });

      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log successful access
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'admin_panel_access_granted',
      entity_type: 'admin_panel',
      details: { success: true },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in verify-admin-password function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
