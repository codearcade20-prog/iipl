-- 1. Site Engineers Table (For external/third-party engineers)
CREATE TABLE IF NOT EXISTS public.site_engineers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    phone TEXT,
    site_id BIGINT REFERENCES public.sites(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Active'
);

-- 2. Labors Table (Random workers)
DROP TABLE IF EXISTS public.labor_attendance_wages;
DROP TABLE IF EXISTS public.labors;

CREATE TABLE IF NOT EXISTS public.labors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    phone TEXT,
    site_id BIGINT REFERENCES public.sites(id) ON DELETE SET NULL,
    engineer_id UUID REFERENCES public.site_engineers(id) ON DELETE SET NULL, -- Now references external engineers
    daily_rate NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Active'
);

-- 3. Attendance & Wages Log
CREATE TABLE IF NOT EXISTS public.labor_attendance_wages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    labor_id UUID REFERENCES public.labors(id) ON DELETE CASCADE,
    site_id BIGINT REFERENCES public.sites(id) ON DELETE CASCADE,
    engineer_id UUID REFERENCES public.site_engineers(id) ON DELETE CASCADE, -- Now references external engineers
    work_date DATE NOT NULL,
    attendance TEXT DEFAULT 'Present', -- Present, Absent, Half Day
    wages_amount NUMERIC DEFAULT 0,
    remarks TEXT,
    payment_status TEXT DEFAULT 'Pending', -- Pending, Paid
    payment_week TEXT -- e.g. "2026-W08"
);

-- Enable RLS and Grant Permissions
ALTER TABLE public.site_engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_attendance_wages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for everyone" ON public.site_engineers;
CREATE POLICY "Enable all access for everyone" ON public.site_engineers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for everyone" ON public.labors;
CREATE POLICY "Enable all access for everyone" ON public.labors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for everyone" ON public.labor_attendance_wages;
CREATE POLICY "Enable all access for everyone" ON public.labor_attendance_wages FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.site_engineers TO anon, authenticated, service_role;
GRANT ALL ON public.labors TO anon, authenticated, service_role;
GRANT ALL ON public.labor_attendance_wages TO anon, authenticated, service_role;
