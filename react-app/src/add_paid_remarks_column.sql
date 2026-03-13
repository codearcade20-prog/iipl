-- Add paid_remarks to petty_cash_entries if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'petty_cash_entries' AND column_name = 'paid_remarks') THEN
        ALTER TABLE petty_cash_entries ADD COLUMN paid_remarks TEXT;
    END IF;
END $$;
