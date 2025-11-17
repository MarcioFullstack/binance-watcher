-- Create table for PnL alert configurations
CREATE TABLE IF NOT EXISTS public.pnl_alert_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'loss' or 'gain'
  trigger_type TEXT NOT NULL, -- 'daily_usdt', 'daily_percent', 'total_usdt', 'total_percent', 'unrealized_usdt'
  threshold NUMERIC NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, alert_type, trigger_type)
);

-- Enable RLS
ALTER TABLE public.pnl_alert_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own PnL alert configs"
  ON public.pnl_alert_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PnL alert configs"
  ON public.pnl_alert_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PnL alert configs"
  ON public.pnl_alert_configs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own PnL alert configs"
  ON public.pnl_alert_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_pnl_alert_configs_updated_at
  BEFORE UPDATE ON public.pnl_alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_pnl_alert_configs_user_id ON public.pnl_alert_configs(user_id);
CREATE INDEX idx_pnl_alert_configs_enabled ON public.pnl_alert_configs(enabled) WHERE enabled = true;