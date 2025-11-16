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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verificar se é admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Acesso negado: apenas administradores');
    }

    // Buscar estatísticas de pagamentos
    const { data: allPayments, error: paymentsError } = await supabaseClient
      .from('pending_payments')
      .select('*');

    if (paymentsError) throw paymentsError;

    // Calcular estatísticas de pagamentos
    const totalPayments = allPayments?.length || 0;
    const confirmedPayments = allPayments?.filter(p => p.status === 'confirmed') || [];
    const pendingPayments = allPayments?.filter(p => p.status === 'pending') || [];
    const rejectedPayments = allPayments?.filter(p => p.status === 'rejected') || [];

    const totalReceived = confirmedPayments.reduce((sum, p) => {
      return sum + (parseFloat(p.confirmed_amount || '0'));
    }, 0);

    const conversionRate = totalPayments > 0 
      ? (confirmedPayments.length / totalPayments) * 100 
      : 0;

    // Pagamentos por dia (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const paymentsByDay: Record<string, { date: string; count: number; amount: number }> = {};
    
    confirmedPayments.forEach(payment => {
      const date = new Date(payment.created_at);
      if (date >= thirtyDaysAgo) {
        const dateKey = date.toISOString().split('T')[0];
        if (!paymentsByDay[dateKey]) {
          paymentsByDay[dateKey] = { date: dateKey, count: 0, amount: 0 };
        }
        paymentsByDay[dateKey].count += 1;
        paymentsByDay[dateKey].amount += parseFloat(payment.confirmed_amount || '0');
      }
    });

    const paymentsChart = Object.values(paymentsByDay)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Estatísticas de usuários
    const { data: allUsers, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id');

    if (usersError) throw usersError;

    const { data: subscriptions, error: subsError } = await supabaseClient
      .from('subscriptions')
      .select('*');

    if (subsError) throw subsError;

    const totalUsers = allUsers?.length || 0;
    const activeSubscriptions = subscriptions?.filter(s => {
      if (s.status !== 'active') return false;
      if (!s.expires_at) return true;
      return new Date(s.expires_at) > new Date();
    }) || [];
    
    const inactiveUsers = totalUsers - activeSubscriptions.length;

    // Estatísticas de assinaturas por status
    const subscriptionsByStatus = subscriptions?.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Top usuários por valor de pagamento
    const userPayments: Record<string, number> = {};
    confirmedPayments.forEach(payment => {
      const userId = payment.user_id;
      userPayments[userId] = (userPayments[userId] || 0) + parseFloat(payment.confirmed_amount || '0');
    });

    const topUsers = Object.entries(userPayments)
      .map(([userId, amount]) => ({ userId, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return new Response(
      JSON.stringify({
        payments: {
          total: totalPayments,
          confirmed: confirmedPayments.length,
          pending: pendingPayments.length,
          rejected: rejectedPayments.length,
          totalReceived: totalReceived.toFixed(2),
          conversionRate: conversionRate.toFixed(1),
          byDay: paymentsChart,
        },
        users: {
          total: totalUsers,
          active: activeSubscriptions.length,
          inactive: inactiveUsers,
          subscriptionsByStatus,
        },
        topUsers,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in admin-stats function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
