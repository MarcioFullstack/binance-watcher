-- Adicionar colunas para controle de notificações push nos alertas
ALTER TABLE public.risk_settings 
ADD COLUMN IF NOT EXISTS loss_push_notifications boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gain_push_notifications boolean DEFAULT false;

-- Comentários nas colunas
COMMENT ON COLUMN public.risk_settings.loss_push_notifications IS 'Habilita notificações push para alertas de perda crítica';
COMMENT ON COLUMN public.risk_settings.gain_push_notifications IS 'Habilita notificações push para alertas de ganho';