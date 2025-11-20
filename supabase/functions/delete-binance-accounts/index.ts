import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      console.error("Authentication error in delete-binance-accounts:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Deleting all Binance accounts for user ${user.id}`);

    // Delete all Binance accounts for this user
    const { error: deleteError } = await supabaseClient
      .from("binance_accounts")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting Binance accounts:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete Binance accounts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also delete daily PnL data
    const { error: pnlError } = await supabaseClient
      .from("daily_pnl")
      .delete()
      .eq("user_id", user.id);

    if (pnlError) {
      console.error("Error deleting daily PnL data:", pnlError);
    }

    // Delete PnL alert configs
    const { error: alertError } = await supabaseClient
      .from("pnl_alert_configs")
      .delete()
      .eq("user_id", user.id);

    if (alertError) {
      console.error("Error deleting PnL alert configs:", alertError);
    }

    // Delete risk settings
    const { error: riskError } = await supabaseClient
      .from("risk_settings")
      .delete()
      .eq("user_id", user.id);

    if (riskError) {
      console.error("Error deleting risk settings:", riskError);
    }

    console.log(`Successfully deleted all Binance-related data for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "All Binance accounts and related data deleted successfully" 
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unhandled error in delete-binance-accounts:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
