-- Add approved_amount column to petty_cash_entries
ALTER TABLE public.petty_cash_entries 
ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(15, 2);

-- Update approved_amount for existing approved records if they don't have it
UPDATE public.petty_cash_entries 
SET approved_amount = total_amount 
WHERE status = 'Approved' AND approved_amount IS NULL;
