-- Create petty_cash_entries table
CREATE TABLE IF NOT EXISTS public.petty_cash_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    site_name TEXT NOT NULL,
    request_person TEXT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create petty_cash_items table
CREATE TABLE IF NOT EXISTS public.petty_cash_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES public.petty_cash_entries(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies (adjust as needed for your app's security model)
ALTER TABLE public.petty_cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now (common for this type of VMS)
CREATE POLICY "Allow authenticated users to read petty_cash_entries" ON public.petty_cash_entries FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert petty_cash_entries" ON public.petty_cash_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update petty_cash_entries" ON public.petty_cash_entries FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated users to delete petty_cash_entries" ON public.petty_cash_entries FOR DELETE USING (true);

CREATE POLICY "Allow authenticated users to read petty_cash_items" ON public.petty_cash_items FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert petty_cash_items" ON public.petty_cash_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update petty_cash_items" ON public.petty_cash_items FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated users to delete petty_cash_items" ON public.petty_cash_items FOR DELETE USING (true);
