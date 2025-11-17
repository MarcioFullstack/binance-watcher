-- Criar tabela para histórico de configurações de alerta
CREATE TABLE public.alert_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID NOT NULL
);

-- Criar índice para busca rápida por usuário e data
CREATE INDEX idx_alert_config_history_user_date ON public.alert_config_history(user_id, changed_at DESC);
CREATE INDEX idx_alert_config_history_changed_by ON public.alert_config_history(changed_by);

-- Habilitar RLS
ALTER TABLE public.alert_config_history ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todo o histórico
CREATE POLICY "Admins can view all alert config history"
  ON public.alert_config_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Política: Usuários podem ver apenas seu próprio histórico
CREATE POLICY "Users can view own alert config history"
  ON public.alert_config_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Sistema pode inserir histórico (via edge functions)
CREATE POLICY "Service role can insert alert config history"
  ON public.alert_config_history
  FOR INSERT
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE public.alert_config_history IS 'Histórico de mudanças nas configurações de alerta';
COMMENT ON COLUMN public.alert_config_history.user_id IS 'ID do usuário que teve a configuração alterada';
COMMENT ON COLUMN public.alert_config_history.alert_type IS 'Tipo de alerta (loss_alert, gain_alert)';
COMMENT ON COLUMN public.alert_config_history.field_changed IS 'Campo que foi alterado (enabled, threshold)';
COMMENT ON COLUMN public.alert_config_history.old_value IS 'Valor anterior';
COMMENT ON COLUMN public.alert_config_history.new_value IS 'Novo valor';
COMMENT ON COLUMN public.alert_config_history.changed_by IS 'ID do usuário que fez a alteração';