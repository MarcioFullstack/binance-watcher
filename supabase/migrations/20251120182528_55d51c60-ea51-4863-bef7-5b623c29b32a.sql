-- Remove the check constraint that restricts level_name to specific values
-- This will allow users to create custom alert levels
ALTER TABLE loss_alert_levels
DROP CONSTRAINT IF EXISTS loss_alert_levels_level_name_check;

-- Add a more flexible constraint that just ensures level_name is not empty
ALTER TABLE loss_alert_levels
ADD CONSTRAINT loss_alert_levels_level_name_not_empty
CHECK (length(trim(level_name)) > 0);