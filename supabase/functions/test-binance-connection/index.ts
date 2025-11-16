import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createSignature(secret: string, queryString: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(queryString);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, apiSecret } = await req.json();

    if (!apiKey || !apiSecret) {
      throw new Error('API Key e Secret são obrigatórios');
    }

    const baseURL = 'https://fapi.binance.com';
    const timestamp = Date.now();
    const recvWindow = 5000;

    // Testar conexão com exchange info
    const testQuery = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const signature = await createSignature(apiSecret, testQuery);

    const response = await fetch(
      `${baseURL}/fapi/v2/balance?${testQuery}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Binance API Error: ${errorData.msg || JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conexão com Binance estabelecida com sucesso!',
        accountType: 'FUTURES',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error testing Binance connection:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
