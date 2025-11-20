-- Criar tabela de configuração de alertas de perda com múltiplos níveis
CREATE TABLE IF NOT EXISTS loss_alert_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_name TEXT NOT NULL CHECK (level_name IN ('warning', 'danger', 'critical', 'emergency')),
  loss_percentage DECIMAL(5, 2) NOT NULL CHECK (loss_percentage > 0 AND loss_percentage <= 100),
  enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  visual_alert BOOLEAN DEFAULT true,
  push_notification BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, level_name)
);

-- Criar tabela de histórico de alertas disparados
CREATE TABLE IF NOT EXISTS loss_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_name TEXT NOT NULL,
  loss_percentage DECIMAL(5, 2) NOT NULL,
  loss_amount DECIMAL(10, 2) NOT NULL,
  balance_at_alert DECIMAL(10, 2) NOT NULL,
  initial_balance DECIMAL(10, 2) NOT NULL,
  alert_message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  triggered_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE loss_alert_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loss_alert_levels
CREATE POLICY "Users can view their own loss alert levels"
  ON loss_alert_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loss alert levels"
  ON loss_alert_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loss alert levels"
  ON loss_alert_levels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loss alert levels"
  ON loss_alert_levels FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for loss_alert_history
CREATE POLICY "Users can view their own loss alert history"
  ON loss_alert_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loss alert history"
  ON loss_alert_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loss alert history"
  ON loss_alert_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_loss_alert_levels_user_id ON loss_alert_levels(user_id);
CREATE INDEX idx_loss_alert_history_user_id ON loss_alert_history(user_id);
CREATE INDEX idx_loss_alert_history_triggered ON loss_alert_history(triggered_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_loss_alert_levels_updated_at
  BEFORE UPDATE ON loss_alert_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir níveis padrão para novos usuários (através de função)
CREATE OR REPLACE FUNCTION create_default_loss_alerts()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO loss_alert_levels (user_id, level_name, loss_percentage, enabled, sound_enabled, visual_alert, push_notification)
  VALUES 
    (NEW.id, 'warning', 2.0, true, false, true, false),
    (NEW.id, 'danger', 5.0, true, true, true, false),
    (NEW.id, 'critical', 8.0, true, true, true, true),
    (NEW.id, 'emergency', 10.0, true, true, true, true)
  ON CONFLICT (user_id, level_name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar alertas padrão quando usuário é criado na tabela profiles
CREATE TRIGGER create_default_loss_alerts_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_loss_alerts();