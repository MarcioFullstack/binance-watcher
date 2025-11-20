import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { type = 'critical_loss' } = await req.json();

    // Inserir notificação de teste
    const { error: notificationError } = await supabaseClient
      .from('notification_history')
      .insert({
        user_id: user.id,
        type: type,
        title: type === 'gain' ? '🎉 TESTE: Alerta de Ganho!' : '🚨 TESTE: Alerta de Perda Crítica!',
        description: type === 'gain' 
          ? 'Este é um teste de alarme de ganho. O som de moedas deve tocar continuamente até você desligar.'
          : 'Este é um teste de alarme de perda. A sirene deve tocar continuamente até você desligar o alarme.',
        is_read: false,
      });

    if (notificationError) {
      throw notificationError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notificação de teste criada com sucesso',
        type: type
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in test-loss-alert:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
