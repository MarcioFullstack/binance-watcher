import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticator } from "npm:otplib@12.0.1";
import { decrypt } from "../_shared/encryption.ts";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
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

      // Delete any old pending verifications for this user
      await supabaseClient
        .from('pending_2fa_verifications')
        .delete()
        .eq('user_id', authData.user.id);

      console.log('[2FA Phase 1] Creating verification for user:', authData.user.id, 'challenge:', challenge);

      // Insert new pending verification
      const { error: insertError } = await supabaseClient
        .from('pending_2fa_verifications')
        .insert({
          user_id: authData.user.id,
          email: authData.user.email!,
          challenge_token: challenge,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        console.error('[2FA Phase 1] Error creating pending verification:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create verification challenge', details: insertError.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }

      console.log('[2FA Phase 1] Successfully created pending verification');

      // Sign out the user session
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

    console.log('[2FA Phase 2] Looking for challenge token:', challengeToken);

    // Retrieve pending verification
    const { data: pending, error: pendingError } = await supabaseClient
      .from('pending_2fa_verifications')
      .select('*')
      .eq('challenge_token', challengeToken)
      .eq('verified', false)
      .maybeSingle();

    console.log('[2FA Phase 2] Pending verification:', pending ? 'FOUND' : 'NOT FOUND', 'Error:', pendingError);

    if (pendingError) {
      console.error('[2FA Phase 2] Database error:', pendingError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: pendingError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (!pending) {
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
      console.log('[2FA Phase 2] Token expired');
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

    // Get user's 2FA secret (encrypted)
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

    // Decrypt TOTP secret
    const decryptedSecret = await decrypt(twoFA.totp_secret);

    // First try TOTP verification
    let isValid = authenticator.verify({
      token: totpCode,
      secret: decryptedSecret
    });

    // If TOTP fails, try backup code
    if (!isValid) {
      const { data: backupData, error: backupError } = await supabaseClient
        .from('backup_codes')
        .select('*')
        .eq('user_id', pending.user_id)
        .eq('code', totpCode.toUpperCase())
        .eq('is_used', false)
        .maybeSingle();

      if (!backupError && backupData) {
        isValid = true;
        // Mark backup code as used
        await supabaseClient
          .from('backup_codes')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', backupData.id);
      }
    }

    if (!isValid) {
      console.log('[2FA Phase 2] Invalid code provided');
      await supabaseClient.from('auth_attempts').insert({
        identifier: pending.email,
        attempt_type: '2fa',
        success: false
      });

      // Increment attempts counter
      await supabaseClient
        .from('pending_2fa_verifications')
        .update({ attempts: pending.attempts + 1 })
        .eq('id', pending.id);

      return new Response(
        JSON.stringify({ error: 'Invalid 2FA code' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    console.log('[2FA Phase 2] Code verified successfully');

    // Mark as verified
    await supabaseClient
      .from('pending_2fa_verifications')
      .update({ verified: true })
      .eq('id', pending.id);

    await supabaseClient.from('auth_attempts').insert({
      identifier: pending.email,
      attempt_type: '2fa',
      success: true
    });

    // Create a new session for the user
    const { data: { session }, error: sessionError } = await supabaseClient.auth.signInWithPassword({
      email: pending.email,
      password: password || ''
    });

    if (sessionError || !session) {
      console.error('[2FA Phase 2] Error creating session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Clean up pending verification
    await supabaseClient
      .from('pending_2fa_verifications')
      .delete()
      .eq('id', pending.id);

    console.log('[2FA Phase 2] Session created successfully');

    return new Response(
      JSON.stringify({
        requires2FA: false,
        session: session,
        user: session.user
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Error] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
