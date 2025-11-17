-- Create table for backup codes
CREATE TABLE IF NOT EXISTS public.backup_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own backup codes
CREATE POLICY "Users can view own backup codes"
ON public.backup_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own backup codes
CREATE POLICY "Users can insert own backup codes"
ON public.backup_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own backup codes
CREATE POLICY "Users can update own backup codes"
ON public.backup_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own backup codes
CREATE POLICY "Users can delete own backup codes"
ON public.backup_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_backup_codes_user_id ON public.backup_codes(user_id);
CREATE INDEX idx_backup_codes_code ON public.backup_codes(code) WHERE NOT is_used;