-- Create Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    employee_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    email TEXT,
    designation TEXT,
    department TEXT,
    date_of_joining DATE,
    basic_salary NUMERIC DEFAULT 0,
    pan_no TEXT,
    bank_name TEXT,
    account_no TEXT,
    ifsc_code TEXT,
    status TEXT DEFAULT 'Active'
);

-- Payroll Table
CREATE TABLE IF NOT EXISTS public.payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    pay_period TEXT NOT NULL, -- e.g. "2026-02"
    pay_days NUMERIC DEFAULT 30,
    per_day_wage NUMERIC DEFAULT 0,
    -- Earnings
    basic_da NUMERIC DEFAULT 0,
    hra NUMERIC DEFAULT 0,
    conveyance NUMERIC DEFAULT 0,
    child_edu NUMERIC DEFAULT 0,
    child_hostel NUMERIC DEFAULT 0,
    med_reimb NUMERIC DEFAULT 0,
    special_allowance NUMERIC DEFAULT 0,
    -- Adjustments
    increment NUMERIC DEFAULT 0,
    arrears NUMERIC DEFAULT 0,
    other_earnings NUMERIC DEFAULT 0,
    allowance_increase NUMERIC DEFAULT 0,
    -- Deductions
    pf NUMERIC DEFAULT 0,
    esi NUMERIC DEFAULT 0,
    advance NUMERIC DEFAULT 0,
    lwf NUMERIC DEFAULT 0,
    lop_amount NUMERIC DEFAULT 0,
    -- Totals
    gross_salary NUMERIC DEFAULT 0,
    total_deductions NUMERIC DEFAULT 0,
    net_pay NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Bank Transfer',
    remarks TEXT
);

-- Enable RLS for payrolls
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

-- Create Policies for payrolls
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.payrolls;
CREATE POLICY "Enable all access for everyone" ON public.payrolls
FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allowing full access for simplicity, similar to other tables in this project)
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.employees;
CREATE POLICY "Enable all access for everyone" ON public.employees
FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions (if needed)
GRANT ALL ON public.employees TO anon;
GRANT ALL ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
