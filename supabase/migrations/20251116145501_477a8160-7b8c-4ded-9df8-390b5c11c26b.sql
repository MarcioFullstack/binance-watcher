-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create risk_settings table
CREATE TABLE IF NOT EXISTS public.risk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_percent DECIMAL(5,2) DEFAULT 10.00,
  risk_active BOOLEAN DEFAULT true,
  daily_reset BOOLEAN DEFAULT true,
  kill_switch_enabled BOOLEAN DEFAULT false,
  initial_balance DECIMAL(20,8) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;

-- Risk settings policies
CREATE POLICY "Users can view own risk settings"
  ON public.risk_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own risk settings"
  ON public.risk_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk settings"
  ON public.risk_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create binance_accounts table
CREATE TABLE IF NOT EXISTS public.binance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.binance_accounts ENABLE ROW LEVEL SECURITY;

-- Binance accounts policies
CREATE POLICY "Users can view own binance accounts"
  ON public.binance_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own binance accounts"
  ON public.binance_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own binance accounts"
  ON public.binance_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own binance accounts"
  ON public.binance_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'inactive',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create vouchers table
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  days INTEGER DEFAULT 30,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Vouchers policies
CREATE POLICY "Anyone can view vouchers"
  ON public.vouchers FOR SELECT
  USING (true);

CREATE POLICY "Users can update vouchers when activating"
  ON public.vouchers FOR UPDATE
  USING (NOT is_used OR used_by = auth.uid());

-- Insert default voucher
INSERT INTO public.vouchers (code, days) 
VALUES ('NOTT-IFY2-025B-OT01', 30)
ON CONFLICT (code) DO NOTHING;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_settings_updated_at
  BEFORE UPDATE ON public.risk_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_binance_accounts_updated_at
  BEFORE UPDATE ON public.binance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();