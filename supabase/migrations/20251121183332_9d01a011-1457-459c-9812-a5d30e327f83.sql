-- Add location columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_state ON public.profiles(state);