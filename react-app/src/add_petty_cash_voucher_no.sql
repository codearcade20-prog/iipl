-- Create a sequence for the voucher numbers if not exists
CREATE SEQUENCE IF NOT EXISTS petty_cash_voucher_num_seq START 1;

-- Add voucher_no column to petty_cash_entries
ALTER TABLE public.petty_cash_entries 
ADD COLUMN IF NOT EXISTS voucher_no TEXT;

-- Update existing records if they don't have a voucher_no
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT id FROM public.petty_cash_entries WHERE voucher_no IS NULL ORDER BY date, created_at) LOOP
        UPDATE public.petty_cash_entries 
        SET voucher_no = 'PCIIPL' || LPAD(nextval('petty_cash_voucher_num_seq')::TEXT, 3, '0')
        WHERE id = r.id;
    END LOOP;
END $$;

-- Make voucher_no unique
ALTER TABLE public.petty_cash_entries ADD CONSTRAINT petty_cash_voucher_no_unique UNIQUE (voucher_no);

-- Function to automatically generate the voucher number
CREATE OR REPLACE FUNCTION generate_pc_voucher_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.voucher_no IS NULL THEN
        NEW.voucher_no := 'PCIIPL' || LPAD(nextval('petty_cash_voucher_num_seq')::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set voucher_no before insertion
DROP TRIGGER IF EXISTS set_pc_voucher_no ON public.petty_cash_entries;
CREATE TRIGGER set_pc_voucher_no
BEFORE INSERT ON public.petty_cash_entries
FOR EACH ROW
EXECUTE FUNCTION generate_pc_voucher_no();
