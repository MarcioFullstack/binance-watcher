import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isExpired: boolean;
  expiresAt: Date | null;
}

export const useSubscriptionTimer = (userId: string | undefined) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
    isExpired: false,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const checkSubscription = async () => {
      try {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("expires_at, status")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();

        if (!subscription) {
          setTimeRemaining({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            total: 0,
            isExpired: true,
            expiresAt: null,
          });
          setLoading(false);
          return;
        }

        const expiresAt = new Date(subscription.expires_at);
        setTimeRemaining((prev) => ({ ...prev, expiresAt }));
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [userId]);

  useEffect(() => {
    if (!timeRemaining.expiresAt) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiry = timeRemaining.expiresAt!.getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
          isExpired: true,
          expiresAt: timeRemaining.expiresAt,
        });
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        total: difference,
        isExpired: false,
        expiresAt: timeRemaining.expiresAt,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining.expiresAt]);

  return { timeRemaining, loading };
};
