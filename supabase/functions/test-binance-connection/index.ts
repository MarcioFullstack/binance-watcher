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
    console.log("Test Binance connection request received");
    
    const body = await req.json();
    console.log("Request body received:", { hasApiKey: !!body.api_key, hasSecret: !!body.api_secret });
    
    const { api_key, api_secret } = body;

    if (!api_key || !api_secret) {
      console.error("Missing API credentials");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Por favor, preencha a API Key e o API Secret" 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Testing Binance Futures API connection...");

    // Test with a simple account info request - increased recvWindow for better reliability
    const timestamp = Date.now();
    const recvWindow = 10000; // 10 seconds window
    const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const signature = await createSignature(api_secret, queryString);

    console.log("Making request to Binance API...");
    const response = await fetch(
      `https://fapi.binance.com/fapi/v2/account?${queryString}&signature=${signature}`,
      {
        headers: {
          "X-MBX-APIKEY": api_key,
        },
      }
    );

    console.log("Binance API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Binance API error response:", errorText);
      
      let errorMessage = "Credenciais inválidas ou permissões insuficientes";
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code === -2015) {
          errorMessage = "API Key inválida ou formato incorreto";
        } else if (errorData.code === -1022) {
          errorMessage = "Assinatura inválida. Verifique seu API Secret";
        } else if (errorData.code === -2014) {
          errorMessage = "API Key não tem permissões para Futures. Ative Futures Trading nas permissões da chave";
        }
        console.error("Parsed error:", errorData);
      } catch (e) {
        console.error("Could not parse error response:", e);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("Connection test successful! Balance:", data.totalWalletBalance);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Conexão estabelecida com sucesso! ✓",
        balance: data.totalWalletBalance 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Exception testing Binance connection:", err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Erro ao testar conexão: ${err.message || 'Erro desconhecido'}` 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
