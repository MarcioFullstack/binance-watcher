-- Adicionar colunas para vouchers reutilizáveis
ALTER TABLE vouchers 
  ADD COLUMN max_uses INTEGER,
  ADD COLUMN current_uses INTEGER NOT NULL DEFAULT 0;

-- Adicionar comentários para documentação
COMMENT ON COLUMN vouchers.max_uses IS 'Número máximo de usos permitidos. NULL = uso único (comportamento padrão)';
COMMENT ON COLUMN vouchers.current_uses IS 'Número atual de usos do voucher';

-- Criar tabela para histórico de ativações de vouchers
CREATE TABLE IF NOT EXISTS voucher_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  days_granted INTEGER NOT NULL,
  UNIQUE(voucher_id, user_id)
);

-- Habilitar RLS na tabela de ativações
ALTER TABLE voucher_activations ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todas as ativações
CREATE POLICY "Admins can view all voucher activations"
  ON voucher_activations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Política: Usuários podem ver suas próprias ativações
CREATE POLICY "Users can view own voucher activations"
  ON voucher_activations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Service role pode inserir ativações
CREATE POLICY "Service role can insert voucher activations"
  ON voucher_activations
  FOR INSERT
  WITH CHECK (true);

-- Criar índice para performance
CREATE INDEX idx_voucher_activations_user ON voucher_activations(user_id);
CREATE INDEX idx_voucher_activations_voucher ON voucher_activations(voucher_id);