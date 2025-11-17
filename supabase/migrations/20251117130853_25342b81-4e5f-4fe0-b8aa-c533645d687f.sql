-- Add subscription plan fields
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_payment_amount numeric;

-- Add plan type to pending payments
ALTER TABLE pending_payments
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'quarterly', 'yearly'));

-- Update existing subscriptions to have plan_type
UPDATE subscriptions 
SET plan_type = 'monthly' 
WHERE plan_type IS NULL;

-- Create function to check and notify expiring subscriptions with auto-renew
CREATE OR REPLACE FUNCTION check_auto_renew_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be called by a cron job to create pending payments for auto-renew subscriptions
  INSERT INTO pending_payments (user_id, wallet_address, expected_amount, currency, status, plan_type)
  SELECT 
    s.user_id,
    '0xf9ef22c89bd224f911eaf61c43a39460540eac4f' as wallet_address,
    CASE 
      WHEN s.plan_type = 'monthly' THEN 10.00
      WHEN s.plan_type = 'quarterly' THEN 25.00
      WHEN s.plan_type = 'yearly' THEN 90.00
    END as expected_amount,
    'USD' as currency,
    'pending' as status,
    s.plan_type
  FROM subscriptions s
  WHERE s.auto_renew = true
    AND s.status = 'active'
    AND s.expires_at <= NOW() + INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM pending_payments pp
      WHERE pp.user_id = s.user_id
        AND pp.status = 'pending'
        AND pp.created_at > NOW() - INTERVAL '7 days'
    );
END;
$$;