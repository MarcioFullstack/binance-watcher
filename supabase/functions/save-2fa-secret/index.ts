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
      console.error("Authentication error in save-2fa-secret:", userError);
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

    const { totp_secret, user_id } = body as {
      totp_secret?: string;
      user_id?: string;
    };

    if (!totp_secret || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: totp_secret, user_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify the user_id matches the authenticated user
    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Saving 2FA secret for user ${user_id}`);

    const encryptedSecret = await encrypt(totp_secret);

    // Check if user already has a 2FA record
    const { data: existing } = await supabaseClient
      .from("user_2fa")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from("user_2fa")
        .update({
          totp_secret: encryptedSecret,
          is_enabled: false,
        })
        .eq("user_id", user_id);

      if (updateError) {
        console.error("Error updating 2FA secret:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update 2FA secret" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabaseClient.from("user_2fa").insert({
        user_id,
        totp_secret: encryptedSecret,
        is_enabled: false,
      });

      if (insertError) {
        console.error("Error inserting 2FA secret:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save 2FA secret" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error in save-2fa-secret:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
