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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Extrair informações da transação
    // Formato pode variar dependendo do provedor (BlockCypher, Alchemy, etc.)
    const {
      transaction_hash,
      address: wallet_address,
      value,
      confirmations,
      currency = 'ETH'
    } = payload;

    if (!transaction_hash || !wallet_address) {
      throw new Error('Missing required fields: transaction_hash or wallet_address');
    }

    console.log(`Processing transaction: ${transaction_hash} to ${wallet_address}`);
    console.log(`Value: ${value}, Currency: ${currency}, Confirmations: ${confirmations}`);

    // Verificar se a transação tem confirmações suficientes (mínimo 3)
    if (confirmations < 3) {
      console.log('Insufficient confirmations, skipping...');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient confirmations' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar pagamento pendente para essa carteira
    const { data: pendingPayments, error: searchError } = await supabaseClient
      .from('pending_payments')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (searchError) {
      console.error('Error searching pending payments:', searchError);
      throw searchError;
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      console.log('No pending payment found for this wallet');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No pending payment found' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payment = pendingPayments[0];
    const expectedAmount = parseFloat(payment.expected_amount);
    const receivedAmount = parseFloat(value);

    console.log(`Expected: ${expectedAmount}, Received: ${receivedAmount}`);

    // Verificar se o valor recebido é suficiente (com margem de 2%)
    const minAcceptedAmount = expectedAmount * 0.98;
    if (receivedAmount < minAcceptedAmount) {
      console.log('Insufficient payment amount');
      
      // Atualizar pagamento como insuficiente
      await supabaseClient
        .from('pending_payments')
        .update({
          status: 'insufficient',
          transaction_hash,
          confirmed_amount: receivedAmount,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient payment amount' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Pagamento confirmado! Ativar assinatura
    console.log('Payment confirmed, activating subscription...');

    // Calcular data de expiração (30 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Verificar se já existe assinatura
    const { data: existingSub } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', payment.user_id)
      .maybeSingle();

    let subError;
    
    if (existingSub) {
      // Atualizar assinatura existente
      const { error } = await supabaseClient
        .from('subscriptions')
        .update({
          status: 'active',
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', payment.user_id);
      subError = error;
    } else {
      // Criar nova assinatura
      const { error } = await supabaseClient
        .from('subscriptions')
        .insert({
          user_id: payment.user_id,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        });
      subError = error;
    }

    if (subError) {
      console.error('Subscription error:', subError);
      throw new Error('Erro ao ativar assinatura');
    }

    // Atualizar status do pagamento
    const { error: updateError } = await supabaseClient
      .from('pending_payments')
      .update({
        status: 'confirmed',
        transaction_hash,
        confirmed_amount: receivedAmount,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      throw updateError;
    }

    console.log('Subscription activated successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment confirmed and subscription activated',
        transaction_hash,
        user_id: payment.user_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in crypto-payment-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
