import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin only' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    let migratedBinance = 0;
    let migratedTOTP = 0;
    let errorsBinance = 0;
    let errorsTOTP = 0;

    // Migrar Binance accounts
    console.log("Starting Binance accounts migration...");
    const { data: binanceAccounts } = await supabaseClient
      .from('binance_accounts')
      .select('*');

    if (binanceAccounts) {
      for (const account of binanceAccounts) {
        try {
          // Verificar se já está criptografado (tenta descriptografar)
          let isEncrypted = false;
          try {
            const { decrypt } = await import("../_shared/encryption.ts");
            await decrypt(account.api_key);
            isEncrypted = true;
          } catch {
            // Não está criptografado
          }

          if (!isEncrypted) {
            const encryptedApiKey = await encrypt(account.api_key);
            const encryptedApiSecret = await encrypt(account.api_secret);

            const { error } = await supabaseClient
              .from('binance_accounts')
              .update({
                api_key: encryptedApiKey,
                api_secret: encryptedApiSecret,
                updated_at: new Date().toISOString()
              })
              .eq('id', account.id);

            if (error) {
              console.error(`Error migrating Binance account ${account.id}:`, error);
              errorsBinance++;
            } else {
              migratedBinance++;
              console.log(`✓ Migrated Binance account ${account.id}`);
            }
          } else {
            console.log(`⊘ Binance account ${account.id} already encrypted`);
          }
        } catch (error) {
          console.error(`Error processing Binance account ${account.id}:`, error);
          errorsBinance++;
        }
      }
    }

    // Migrar TOTP secrets
    console.log("Starting TOTP secrets migration...");
    const { data: totpSecrets } = await supabaseClient
      .from('user_2fa')
      .select('*');

    if (totpSecrets) {
      for (const totp of totpSecrets) {
        try {
          // Verificar se já está criptografado
          let isEncrypted = false;
          try {
            const { decrypt } = await import("../_shared/encryption.ts");
            await decrypt(totp.totp_secret);
            isEncrypted = true;
          } catch {
            // Não está criptografado
          }

          if (!isEncrypted) {
            const encryptedSecret = await encrypt(totp.totp_secret);

            const { error } = await supabaseClient
              .from('user_2fa')
              .update({
                totp_secret: encryptedSecret,
                updated_at: new Date().toISOString()
              })
              .eq('id', totp.id);

            if (error) {
              console.error(`Error migrating TOTP secret ${totp.id}:`, error);
              errorsTOTP++;
            } else {
              migratedTOTP++;
              console.log(`✓ Migrated TOTP secret for user ${totp.user_id}`);
            }
          } else {
            console.log(`⊘ TOTP secret ${totp.id} already encrypted`);
          }
        } catch (error) {
          console.error(`Error processing TOTP secret ${totp.id}:`, error);
          errorsTOTP++;
        }
      }
    }

    const summary = {
      success: true,
      binance: {
        migrated: migratedBinance,
        errors: errorsBinance,
        total: binanceAccounts?.length || 0
      },
      totp: {
        migrated: migratedTOTP,
        errors: errorsTOTP,
        total: totpSecrets?.length || 0
      },
      message: `Migration completed. Binance: ${migratedBinance}/${binanceAccounts?.length || 0}, TOTP: ${migratedTOTP}/${totpSecrets?.length || 0}`
    };

    console.log("Migration summary:", summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
