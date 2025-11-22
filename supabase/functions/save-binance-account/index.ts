import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Authentication error in save-binance-account:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { account_name, api_key, api_secret } = body as {
      account_name?: string;
      api_key?: string;
      api_secret?: string;
    };

    console.log("Received fields:", { 
      hasAccountName: !!account_name, 
      hasApiKey: !!api_key, 
      hasSecret: !!api_secret 
    });

    if (!account_name || !api_key || !api_secret) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Saving Binance account for user ${user.id}: ${account_name}`);

    console.log("Encrypting credentials...");
    const encryptedApiKey = await encrypt(api_key);
    const encryptedApiSecret = await encrypt(api_secret);
    console.log("Credentials encrypted successfully");

    // Remove existing Binance accounts for this user to avoid inconsistent data
    console.log("Deleting existing Binance accounts...");
    const { error: deleteError } = await supabaseClient
      .from("binance_accounts")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting existing Binance accounts:", deleteError);
      return new Response(JSON.stringify({ error: "Erro ao remover contas existentes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Inserting new Binance account...");
    const { error: insertError } = await supabaseClient.from("binance_accounts").insert({
      user_id: user.id,
      account_name,
      api_key: encryptedApiKey,
      api_secret: encryptedApiSecret,
      is_active: true,
    });

    if (insertError) {
      console.error("Error inserting Binance account:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar conta Binance" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Binance account saved successfully!");
    return new Response(JSON.stringify({ 
      success: true,
      message: "Conta Binance configurada com sucesso!"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Unhandled error in save-binance-account:", err);
    return new Response(JSON.stringify({ 
      error: err.message || "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
