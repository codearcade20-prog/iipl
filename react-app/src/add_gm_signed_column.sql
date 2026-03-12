-- SQL Migration: Add gm_signed column to payment_history
ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS gm_signed BOOLEAN DEFAULT false;

-- Optional: If you want to mark existing Approved/Paid records as gm_signed
-- Use this with caution as per user feedback
-- UPDATE payment_history SET gm_signed = true WHERE status IN ('Approved', 'Paid', 'Partial');
