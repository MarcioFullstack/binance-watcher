import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { token, secret } = await req.json();

    if (!token || !secret) {
      return new Response(
        JSON.stringify({ error: 'Token and secret are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verify the TOTP token
    const isValid = authenticator.verify({
      token,
      secret
    });
    
    console.log('TOTP verification result:', isValid);

    return new Response(
      JSON.stringify({ isValid }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error verifying TOTP:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
