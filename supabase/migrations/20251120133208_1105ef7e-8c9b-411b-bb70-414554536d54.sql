-- Fix security warnings: Set search_path for the create_default_loss_alerts function
CREATE OR REPLACE FUNCTION create_default_loss_alerts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;