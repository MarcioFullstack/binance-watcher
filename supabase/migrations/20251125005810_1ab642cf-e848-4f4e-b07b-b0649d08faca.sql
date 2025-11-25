-- Adicionar campo para fechar posições automaticamente quando o alarme for acionado
ALTER TABLE public.risk_settings 
ADD COLUMN auto_close_positions boolean DEFAULT false;

COMMENT ON COLUMN public.risk_settings.auto_close_positions IS 'Se habilitado, fecha automaticamente todas as posições quando o alarme de perda for acionado';