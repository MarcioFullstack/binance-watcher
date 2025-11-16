-- Criar tabela para rastrear pagamentos pendentes
CREATE TABLE public.pending_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  expected_amount NUMERIC NOT NULL DEFAULT 15.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_hash TEXT,
  confirmed_amount NUMERIC,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own pending payments"
ON public.pending_payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending payments"
ON public.pending_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_pending_payments_user_id ON public.pending_payments(user_id);
CREATE INDEX idx_pending_payments_status ON public.pending_payments(status);
CREATE INDEX idx_pending_payments_wallet ON public.pending_payments(wallet_address);

-- Trigger para updated_at
CREATE TRIGGER update_pending_payments_updated_at
BEFORE UPDATE ON public.pending_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();