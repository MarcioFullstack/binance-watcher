-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Service role only 2fa" ON public.pending_2fa_verifications;

-- Create a new policy that allows service role operations
-- Service role bypasses RLS, so we just need to ensure the policy exists
CREATE POLICY "Enable all access for service role"
ON public.pending_2fa_verifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);