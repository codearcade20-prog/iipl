-- SQL Migration: Add gm_signature column to payment_history
ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS gm_signature TEXT;

-- Optional: If you want to associate existing approved records with the current global signature
-- UPDATE payment_history 
-- SET gm_signature = (SELECT setting_value FROM app_settings WHERE setting_key = 'gm_signature_url' LIMIT 1)
-- WHERE status IN ('Approved', 'Paid', 'Partial') AND gm_signature IS NULL;
