import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const getAlertTypeLabel = (alertType: string): string => {
  const labels: Record<string, string> = {
    'vouchers_per_day': 'Vouchers por Dia',
    'payment_rejection_rate': 'Taxa de Rejeição de Pagamentos',
    'high_payment_volume': 'Volume Alto de Pagamentos'
  };
  return labels[alertType] || alertType;
};

const getAlertDescription = (alertType: string, details: any): string => {
  switch (alertType) {
    case 'vouchers_per_day':
      return `${details.count} vouchers criados hoje (limite: ${details.threshold})`;
    case 'payment_rejection_rate':
      return `Taxa de rejeição: ${details.rejectionRate}% (limite: ${details.threshold}%)`;
    case 'high_payment_volume':
      return `${details.count} pagamentos pendentes (limite: ${details.threshold})`;
    default:
      return JSON.stringify(details);
  }
};

export const useAlertsRealtime = (userId: string | undefined, isAdmin: boolean = false) => {
  useEffect(() => {
    if (!userId) return;

    console.log('Setting up alerts realtime subscription for user:', userId, 'isAdmin:', isAdmin);

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        async (payload) => {
          console.log('New alert received:', payload);
          
          const newAlert = payload.new as any;
          
          // Fetch alert config to get alert type
          const { data: alertConfig } = await supabase
            .from('alert_configs')
            .select('alert_type')
            .eq('id', newAlert.alert_config_id)
            .maybeSingle();

          if (alertConfig) {
            const alertTypeLabel = getAlertTypeLabel(alertConfig.alert_type);
            const description = getAlertDescription(alertConfig.alert_type, newAlert.details);

            // Show toast notification
            toast({
              title: `⚠️ Alerta Crítico: ${alertTypeLabel}`,
              description,
              variant: "destructive",
              duration: 10000, // 10 seconds for critical alerts
            });

            // Save to notification history for the user
            await supabase.from('notification_history').insert({
              user_id: userId,
              title: `Alerta Crítico: ${alertTypeLabel}`,
              description,
              type: 'error'
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Alerts realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up alerts realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin]);
};
