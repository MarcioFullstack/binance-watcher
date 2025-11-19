-- Criar tabela para rate limiting de autenticação
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  attempt_type TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT
);

-- Índices para performance de rate limiting
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identifier_type_time 
  ON public.auth_attempts(identifier, attempt_type, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_time 
  ON public.auth_attempts(attempted_at);

-- Função para limpar tentativas antigas
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_attempts 
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Função para verificar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_attempt_type TEXT,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.auth_attempts
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND attempted_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- Tabela para armazenar estado de sessões 2FA pendentes
CREATE TABLE IF NOT EXISTS public.pending_2fa_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  challenge_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pending_2fa_time 
  ON public.pending_2fa_verifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_pending_2fa_token 
  ON public.pending_2fa_verifications(challenge_token);

-- RLS para tabelas de segurança
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_2fa_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.auth_attempts FOR ALL USING (FALSE);
CREATE POLICY "Service role only 2fa" ON public.pending_2fa_verifications FOR ALL USING (FALSE);