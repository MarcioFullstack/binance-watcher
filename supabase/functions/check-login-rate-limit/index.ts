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
    const { identifier, attemptType, success = false } = await req.json();

    if (!identifier || !attemptType) {
      return new Response(
        JSON.stringify({ error: 'Identifier and attemptType are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Define rate limits based on attempt type
    const rateLimits: Record<string, { max: number, minutes: number }> = {
      'login': { max: 5, minutes: 15 },
      'signup': { max: 3, minutes: 60 },
      'password_reset': { max: 3, minutes: 60 },
      'voucher': { max: 5, minutes: 10 }
    };

    const limit = rateLimits[attemptType] || { max: 5, minutes: 15 };

    // Check rate limit
    const { data: canProceed } = await supabaseClient
      .rpc('check_rate_limit', {
        p_identifier: identifier,
        p_attempt_type: attemptType,
        p_max_attempts: limit.max,
        p_window_minutes: limit.minutes
      });

    // Log the attempt
    await supabaseClient.from('auth_attempts').insert({
      identifier,
      attempt_type: attemptType,
      success
    });

    if (!canProceed) {
      console.error(`Rate limit exceeded for ${attemptType}:`, identifier);
      return new Response(
        JSON.stringify({ 
          allowed: false,
          error: 'Too many attempts',
          message: `Please wait ${limit.minutes} minutes before trying again`,
          retryAfter: limit.minutes * 60
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    return new Response(
      JSON.stringify({ allowed: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in check-login-rate-limit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
