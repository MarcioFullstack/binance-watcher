import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  userId: string;
  status: string;
  expiresAt: string | null;
}

export const useSubscriptionRealtime = (userId: string | undefined) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial subscription status
    const fetchInitialStatus = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setSubscriptionStatus({
          userId: data.user_id,
          status: data.status || 'inactive',
          expiresAt: data.expires_at
        });
        
        // Check and notify if subscription is expiring soon
        checkAndNotify(data);
      }
    };

    fetchInitialStatus();

    // Set up realtime subscription
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Subscription change detected:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as any;
            
            setSubscriptionStatus({
              userId: newData.user_id,
              status: newData.status || 'inactive',
              expiresAt: newData.expires_at
            });

            // Notify user of changes
            checkAndNotify(newData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const checkAndNotify = (subscription: any) => {
    if (!subscription.expires_at || subscription.status !== 'active') {
      if (subscription.status === 'inactive') {
        toast({
          title: "Assinatura Inativa",
          description: "Sua assinatura está inativa. Ative agora para continuar usando o NOTTIFY.",
          variant: "destructive",
        });
      }
      return;
    }

    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      toast({
        title: "Assinatura Expirada",
        description: "Sua assinatura expirou. Renove agora para continuar usando todos os recursos.",
        variant: "destructive",
      });
    } else if (daysRemaining <= 3) {
      toast({
        title: "Assinatura Expirando em Breve",
        description: `Sua assinatura expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Renove agora para evitar interrupções.`,
        variant: "destructive",
      });
    } else if (daysRemaining <= 7) {
      toast({
        title: "Lembrete de Renovação",
        description: `Sua assinatura expira em ${daysRemaining} dias. Planeje sua renovação.`,
      });
    } else if (daysRemaining > 7 && subscription.status === 'active') {
      // Only show this on subscription activation/renewal
      toast({
        title: "Assinatura Ativa",
        description: `Sua assinatura está ativa até ${expiresAt.toLocaleDateString('pt-BR')}.`,
      });
    }
  };

  return { subscriptionStatus };
};
