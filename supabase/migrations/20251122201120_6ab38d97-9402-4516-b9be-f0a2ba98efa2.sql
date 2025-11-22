
-- Add unique constraint to prevent duplicate voucher activations per user
-- This prevents the same user from activating the same voucher multiple times
ALTER TABLE voucher_activations 
ADD CONSTRAINT voucher_activations_user_voucher_unique 
UNIQUE (voucher_id, user_id);

-- Create an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_voucher_activations_user_voucher 
ON voucher_activations(user_id, voucher_id);

-- Fix inconsistent current_uses counts by updating based on actual activations
UPDATE vouchers v
SET current_uses = COALESCE((
  SELECT COUNT(DISTINCT user_id)
  FROM voucher_activations va
  WHERE va.voucher_id = v.id
), 0);
