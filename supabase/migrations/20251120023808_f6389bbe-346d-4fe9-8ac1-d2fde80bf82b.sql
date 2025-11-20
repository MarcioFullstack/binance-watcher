-- Create function to cleanup expired 2FA verification tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired 2FA verification tokens
  DELETE FROM public.pending_2fa_verifications 
  WHERE expires_at < NOW();
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up expired 2FA tokens at %', NOW();
END;
$$;