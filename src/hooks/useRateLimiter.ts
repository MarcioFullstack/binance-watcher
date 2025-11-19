import { supabase } from "@/integrations/supabase/client";

export type AttemptType = 'login' | 'signup' | 'password_reset' | 'voucher';

interface RateLimitResult {
  allowed: boolean;
  error?: string;
  message?: string;
  retryAfter?: number;
}

export const checkRateLimit = async (
  identifier: string,
  attemptType: AttemptType,
  success: boolean = false
): Promise<RateLimitResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-login-rate-limit', {
      body: { identifier, attemptType, success }
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Allow on error to prevent blocking legitimate users
      return { allowed: true };
    }

    return data;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // Allow on error to prevent blocking legitimate users
    return { allowed: true };
  }
};

export const useRateLimiter = () => {
  return { checkRateLimit };
};
