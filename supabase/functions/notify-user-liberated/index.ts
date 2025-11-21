import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userEmail: string;
  userName?: string;
  expiresAt: string;
  planType: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is admin
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { userEmail, userName, expiresAt, planType }: NotificationRequest = await req.json();

    console.log("Sending liberation notification to:", userEmail);

    const expirationDate = new Date(expiresAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const emailResponse = await resend.emails.send({
      from: "Nottify <onboarding@resend.dev>",
      to: [userEmail],
      subject: "🎉 Seu acesso ao Nottify foi liberado!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                background-color: #f4f4f4;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 40px;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 32px;
                font-weight: bold;
                color: #4F46E5;
                margin-bottom: 10px;
              }
              .title {
                color: #333333;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
              }
              .content {
                color: #666666;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
              }
              .info-box {
                background-color: #f8f9fa;
                border-left: 4px solid #4F46E5;
                padding: 20px;
                margin: 20px 0;
              }
              .info-item {
                margin: 10px 0;
              }
              .info-label {
                font-weight: bold;
                color: #333333;
              }
              .info-value {
                color: #666666;
              }
              .button {
                display: inline-block;
                padding: 14px 28px;
                background-color: #4F46E5;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #999999;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🔔 Nottify</div>
              </div>
              
              <h1 class="title">Seu acesso foi liberado! 🎉</h1>
              
              <div class="content">
                <p>Olá${userName ? ` ${userName}` : ""}!</p>
                <p>Temos ótimas notícias! Seu acesso à plataforma Nottify foi liberado por um administrador.</p>
                
                <div class="info-box">
                  <div class="info-item">
                    <span class="info-label">Plano:</span>
                    <span class="info-value">${planType.charAt(0).toUpperCase() + planType.slice(1)}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Validade:</span>
                    <span class="info-value">30 dias</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Expira em:</span>
                    <span class="info-value">${expirationDate}</span>
                  </div>
                </div>
                
                <p>Agora você pode aproveitar todos os recursos da plataforma:</p>
                <ul>
                  <li>Alertas de perda em tempo real</li>
                  <li>Monitoramento de PnL diário</li>
                  <li>Integração com Binance</li>
                  <li>Notificações personalizadas</li>
                  <li>E muito mais!</li>
                </ul>
                
                <center>
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || ""}/dashboard" class="button">
                    Acessar Plataforma
                  </a>
                </center>
              </div>
              
              <div class="footer">
                <p>Este é um email automático do Nottify</p>
                <p>Se você não solicitou este acesso, entre em contato com o suporte.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-user-liberated function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
