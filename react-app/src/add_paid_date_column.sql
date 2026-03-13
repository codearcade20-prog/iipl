-- Add paid_date to petty_cash_entries if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'petty_cash_entries' AND column_name = 'paid_date') THEN
        ALTER TABLE petty_cash_entries ADD COLUMN paid_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
