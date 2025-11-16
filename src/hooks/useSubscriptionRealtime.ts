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

  const checkAndNotify = async (subscription: any) => {
    if (!subscription.expires_at || subscription.status !== 'active') {
      if (subscription.status === 'inactive') {
        const title = "Assinatura Inativa";
        const description = "Sua assinatura está inativa. Ative agora para continuar usando o NOTTIFY.";
        
        toast({
          title,
          description,
          variant: "destructive",
        });

        // Save to history
        await supabase.from('notification_history').insert({
          user_id: userId,
          title,
          description,
          type: 'error'
        });
      }
      return;
    }

    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let title = "";
    let description = "";
    let type = "info";
    let variant: "default" | "destructive" = "default";

    if (daysRemaining <= 0) {
      title = "Assinatura Expirada";
      description = "Sua assinatura expirou. Renove agora para continuar usando todos os recursos.";
      type = "error";
      variant = "destructive";
    } else if (daysRemaining <= 3) {
      title = "Assinatura Expirando em Breve";
      description = `Sua assinatura expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Renove agora para evitar interrupções.`;
      type = "warning";
      variant = "destructive";
    } else if (daysRemaining <= 7) {
      title = "Lembrete de Renovação";
      description = `Sua assinatura expira em ${daysRemaining} dias. Planeje sua renovação.`;
      type = "warning";
    } else if (daysRemaining > 7 && subscription.status === 'active') {
      title = "Assinatura Ativa";
      description = `Sua assinatura está ativa até ${expiresAt.toLocaleDateString('pt-BR')}.`;
      type = "success";
    }

    if (title && description) {
      toast({
        title,
        description,
        variant,
      });

      // Save to history
      await supabase.from('notification_history').insert({
        user_id: userId,
        title,
        description,
        type
      });
    }
  };

  return { subscriptionStatus };
};
