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

  // 🚨 WEBHOOK TEMPORARILY DISABLED FOR SECURITY
  // This webhook lacks signature verification and is vulnerable to payment forgery
  // DO NOT re-enable until HMAC signature verification is implemented
  // 
  // Required security improvements before re-enabling:
  // 1. Add HMAC signature verification using WEBHOOK_SECRET
  // 2. Verify transaction on blockchain before activating subscription
  // 3. Add IP whitelist for webhook provider
  // 4. Implement idempotency keys in addition to transaction_hash check
  // 5. Log all webhook attempts with signature validation status
  
  console.error('SECURITY: Payment webhook is disabled - missing signature verification');
  
  return new Response(
    JSON.stringify({ 
      error: 'Webhook temporarily disabled for security implementation',
      message: 'Payment processing is under maintenance for security improvements. Please contact support.'
    }),
    { 
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
