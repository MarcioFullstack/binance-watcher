-- Create enum for alert types
CREATE TYPE public.alert_type AS ENUM (
  'vouchers_per_day',
  'payment_rejection_rate',
  'high_payment_volume'
);

-- Create alert_configs table for storing alert configuration
CREATE TABLE public.alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type alert_type NOT NULL UNIQUE,
  threshold NUMERIC NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

-- Create alerts table for storing triggered alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id UUID REFERENCES public.alert_configs(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  details JSONB NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_configs
CREATE POLICY "Admins can view alert configs"
  ON public.alert_configs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alert configs"
  ON public.alert_configs
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert alert configs"
  ON public.alert_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for alerts
CREATE POLICY "Admins can view alerts"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts"
  ON public.alerts
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_alert_configs_updated_at
  BEFORE UPDATE ON public.alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default alert configurations
INSERT INTO public.alert_configs (alert_type, threshold, enabled) VALUES
  ('vouchers_per_day', 50, true),
  ('payment_rejection_rate', 30, true),
  ('high_payment_volume', 100, true);