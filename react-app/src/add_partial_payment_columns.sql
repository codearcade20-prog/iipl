-- SQL Migration: Add Partial Payment Columns to payment_history table

ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC DEFAULT 0;

-- Optional: If you want to initialize remaining_amount for existing Paid records
UPDATE payment_history 
SET paid_amount = amount, remaining_amount = 0 
WHERE status = 'Paid' AND paid_amount = 0;

-- Optional: If you want to initialize remaining_amount for Pending records
UPDATE payment_history 
SET remaining_amount = amount 
WHERE status != 'Paid' AND remaining_amount = 0;
