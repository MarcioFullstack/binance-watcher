import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function createSignature(secret: string, queryString: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(queryString));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, api_secret } = await req.json();

    if (!api_key || !api_secret) {
      return new Response(
        JSON.stringify({ error: "Missing API key or secret" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Testing Binance connection...");

    // Test with a simple account info request
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await createSignature(api_secret, queryString);

    const response = await fetch(
      `https://fapi.binance.com/fapi/v2/account?${queryString}&signature=${signature}`,
      {
        headers: {
          "X-MBX-APIKEY": api_key,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Binance API error:", errorData);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid API credentials or insufficient permissions" 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("Connection test successful");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Connection successful",
        balance: data.totalWalletBalance 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error testing Binance connection:", err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Failed to test connection" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
