-- Create petty_cash_persons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.petty_cash_persons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    bank_name TEXT,
    pan_number TEXT,
    person_type TEXT DEFAULT 'Employee', -- 'Employee' or 'Vendor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update petty_cash_entries table
ALTER TABLE public.petty_cash_entries 
ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.petty_cash_persons(id),
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'Operational Expense', -- 'Staff Advance' or 'Operational Expense'
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
ADD COLUMN IF NOT EXISTS md_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS md_signature TEXT,
ADD COLUMN IF NOT EXISTS md_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS md_remarks TEXT;

-- Enable RLS for petty_cash_persons
ALTER TABLE public.petty_cash_persons ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now
CREATE POLICY "Allow authenticated users to read petty_cash_persons" ON public.petty_cash_persons FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert petty_cash_persons" ON public.petty_cash_persons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update petty_cash_persons" ON public.petty_cash_persons FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated users to delete petty_cash_persons" ON public.petty_cash_persons FOR DELETE USING (true);
