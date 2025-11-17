-- Create table for daily PnL records
CREATE TABLE public.daily_pnl (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  pnl_usd NUMERIC NOT NULL DEFAULT 0,
  pnl_percentage NUMERIC NOT NULL DEFAULT 0,
  market_type TEXT NOT NULL DEFAULT 'USDT', -- 'USDT' or 'COIN'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, market_type)
);

-- Enable RLS
ALTER TABLE public.daily_pnl ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own daily PnL"
  ON public.daily_pnl
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily PnL"
  ON public.daily_pnl
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily PnL"
  ON public.daily_pnl
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_daily_pnl_user_date ON public.daily_pnl(user_id, date DESC);
CREATE INDEX idx_daily_pnl_user_market_date ON public.daily_pnl(user_id, market_type, date DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_pnl;

-- Create trigger for updated_at
CREATE TRIGGER update_daily_pnl_updated_at
  BEFORE UPDATE ON public.daily_pnl
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();