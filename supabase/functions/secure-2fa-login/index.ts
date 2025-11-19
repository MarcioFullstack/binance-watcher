import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticator } from "npm:otplib@12.0.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, totpCode, challengeToken } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // PHASE 1: Email/Password verification (no challengeToken yet)
    if (!challengeToken) {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      // Check rate limit for login attempts
      const { data: canProceed } = await supabaseClient
        .rpc('check_rate_limit', {
          p_identifier: email,
          p_attempt_type: 'login',
          p_max_attempts: 5,
          p_window_minutes: 15
        });

      if (!canProceed) {
        await supabaseClient.from('auth_attempts').insert({
          identifier: email,
          attempt_type: 'login',
          success: false
        });

        return new Response(
          JSON.stringify({ 
            error: 'Too many login attempts',
            message: 'Please wait 15 minutes before trying again'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429 
          }
        );
      }

      // Verify credentials using admin API
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        await supabaseClient.from('auth_attempts').insert({
          identifier: email,
          attempt_type: 'login',
          success: false
        });

        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401 
          }
        );
      }

      // Check if user has 2FA enabled
      const { data: twoFA } = await supabaseClient
        .from('user_2fa')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('is_enabled', true)
        .maybeSingle();

      // If no 2FA, return session immediately
      if (!twoFA) {
        await supabaseClient.from('auth_attempts').insert({
          identifier: email,
          attempt_type: 'login',
          success: true
        });

        return new Response(
          JSON.stringify({
            requires2FA: false,
            session: authData.session,
            user: authData.user
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      // 2FA is enabled - create pending verification
      const challenge = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await supabaseClient.from('pending_2fa_verifications').insert({
        user_id: authData.user.id,
        email: authData.user.email!,
        challenge_token: challenge,
        expires_at: expiresAt.toISOString()
      });

      // Immediately sign out the user - they don't get a session until 2FA passes
      await supabaseClient.auth.admin.signOut(authData.session.access_token);

      return new Response(
        JSON.stringify({
          requires2FA: true,
          challengeToken: challenge,
          expiresAt: expiresAt.toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // PHASE 2: 2FA verification (challengeToken provided)
    if (!totpCode) {
      return new Response(
        JSON.stringify({ error: 'TOTP code is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Retrieve pending verification
    const { data: pending, error: pendingError } = await supabaseClient
      .from('pending_2fa_verifications')
      .select('*')
      .eq('challenge_token', challengeToken)
      .eq('verified', false)
      .maybeSingle();

    if (pendingError || !pending) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired challenge token' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Check if token expired
    if (new Date(pending.expires_at) < new Date()) {
      await supabaseClient
        .from('pending_2fa_verifications')
        .delete()
        .eq('id', pending.id);

      return new Response(
        JSON.stringify({ error: 'Challenge token expired' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Check rate limit for 2FA attempts
    const { data: canProceed2FA } = await supabaseClient
      .rpc('check_rate_limit', {
        p_identifier: pending.email,
        p_attempt_type: '2fa',
        p_max_attempts: 3,
        p_window_minutes: 5
      });

    if (!canProceed2FA) {
      await supabaseClient.from('auth_attempts').insert({
        identifier: pending.email,
        attempt_type: '2fa',
        success: false
      });

      return new Response(
        JSON.stringify({ 
          error: 'Too many 2FA attempts',
          message: 'Please wait 5 minutes before trying again'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    // Get user's 2FA secret
    const { data: twoFA } = await supabaseClient
      .from('user_2fa')
      .select('totp_secret')
      .eq('user_id', pending.user_id)
      .single();

    if (!twoFA) {
      return new Response(
        JSON.stringify({ error: '2FA not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verify TOTP
    const isValid = authenticator.verify({
      token: totpCode,
      secret: twoFA.totp_secret
    });

    // Increment attempts
    await supabaseClient
      .from('pending_2fa_verifications')
      .update({ attempts: pending.attempts + 1 })
      .eq('id', pending.id);

    // Log attempt
    await supabaseClient.from('auth_attempts').insert({
      identifier: pending.email,
      attempt_type: '2fa',
      success: isValid
    });

    if (!isValid) {
      // Delete challenge after 3 failed attempts
      if (pending.attempts >= 2) {
        await supabaseClient
          .from('pending_2fa_verifications')
          .delete()
          .eq('id', pending.id);

        return new Response(
          JSON.stringify({ 
            error: 'Too many failed attempts',
            message: 'Please login again'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401 
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid 2FA code' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // 2FA passed! Mark as verified and create session
    await supabaseClient
      .from('pending_2fa_verifications')
      .update({ verified: true })
      .eq('id', pending.id);

    // Create a new session for the user
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: pending.email
    });

    if (sessionError || !sessionData) {
      console.error('Failed to create session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Clean up old pending verifications
    await supabaseClient
      .from('pending_2fa_verifications')
      .delete()
      .eq('user_id', pending.user_id)
      .lt('expires_at', new Date().toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        magicLink: sessionData.properties.action_link
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in secure-2fa-login:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
