-- Remove the public SELECT policy that exposes all voucher codes
DROP POLICY IF EXISTS "Anyone can view vouchers" ON public.vouchers;

-- Add a secure policy that only allows users to view vouchers they have used
CREATE POLICY "Users can view own used vouchers" 
ON public.vouchers 
FOR SELECT 
TO authenticated
USING (used_by = auth.uid());