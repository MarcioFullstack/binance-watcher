ALTER POLICY "Enable all access for service role"
ON public.pending_2fa_verifications
TO anon, authenticated, service_role;