-- Add siren_type column to risk_settings table
ALTER TABLE public.risk_settings
ADD COLUMN IF NOT EXISTS siren_type text NOT NULL DEFAULT 'police'
CHECK (siren_type IN ('police', 'ambulance', 'fire', 'air_raid', 'car_alarm', 'buzzer'));