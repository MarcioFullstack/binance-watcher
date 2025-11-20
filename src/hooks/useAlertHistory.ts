import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAlertHistory = () => {
  return useQuery({
    queryKey: ['alert-history-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("loss_alert_history")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const total = data?.length || 0;
      const pending = data?.filter(a => !a.acknowledged).length || 0;
      const lastAlert = data?.[0];

      return {
        total,
        pending,
        lastAlert,
      };
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};
