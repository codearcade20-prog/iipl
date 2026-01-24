-- SQL Migration: Add payment_splits column to payment_history

ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS payment_splits JSONB DEFAULT '[]'::jsonb;

-- Initialize splits for existing Paid records
UPDATE payment_history 
SET payment_splits = jsonb_build_array(
    jsonb_build_object('amount', amount, 'date', paid_date)
)
WHERE status = 'Paid' AND (payment_splits IS NULL OR payment_splits = '[]'::jsonb) AND paid_date IS NOT NULL;
