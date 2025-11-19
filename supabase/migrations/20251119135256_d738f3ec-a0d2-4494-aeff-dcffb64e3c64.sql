-- Remove trial subscription trigger and function
-- This will require users to pay or use a voucher before accessing Binance API setup

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.activate_trial_subscription();

-- Also remove any existing trial subscriptions that haven't been paid for
-- Keep only subscriptions that were activated via voucher or payment
DELETE FROM public.subscriptions 
WHERE status = 'active' 
  AND last_payment_amount IS NULL 
  AND created_at = updated_at
  AND NOT EXISTS (
    SELECT 1 FROM vouchers v 
    WHERE v.used_by = subscriptions.user_id 
      AND v.is_used = true
  );