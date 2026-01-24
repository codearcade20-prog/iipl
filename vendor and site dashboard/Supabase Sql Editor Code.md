DO $$
DECLARE
  site_id uuid;
  vendor_id uuid;
  wo_id uuid;
BEGIN
    -- SITE: GRT GUKATPALLY ZIBE
    INSERT INTO public.sites (name) VALUES ('GRT GUKATPALLY ZIBE') RETURNING id INTO site_id;
        -- Vendor: SN ENTERPRISES
        INSERT INTO public.vendors (name) VALUES ('SN ENTERPRISES') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/SEP/02/25-26', 444000) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 100000, NULL);
        -- Vendor: RAMBHUROASH SHARMA
        INSERT INTO public.vendors (name) VALUES ('RAMBHUROASH SHARMA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/AUG/06/25-26', 636950) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 50000, NULL);
    -- SITE: GRT THIRUNELVELI
    INSERT INTO public.sites (name) VALUES ('GRT THIRUNELVELI') RETURNING id INTO site_id;
        -- Vendor: RAMBHUROASH SHARMA
        INSERT INTO public.vendors (name) VALUES ('RAMBHUROASH SHARMA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/21/25-26', 746050) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 100000, NULL);
        -- Vendor: DOODHNATH GUPTA
        INSERT INTO public.vendors (name) VALUES ('DOODHNATH GUPTA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/22/25-26', 339150) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 100000, NULL);
        -- Vendor: BABU (BENGAL DECORS)
        INSERT INTO public.vendors (name) VALUES ('BABU (BENGAL DECORS)') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/20/25-26', 898075) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 100000, NULL);
    -- SITE: GRT THENI
    INSERT INTO public.sites (name) VALUES ('GRT THENI') RETURNING id INTO site_id;
        -- Vendor: RAJENDRA KUMAR VARMA
        INSERT INTO public.vendors (name) VALUES ('RAJENDRA KUMAR VARMA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: DHARMENDAR SHARM
        INSERT INTO public.vendors (name) VALUES ('DHARMENDAR SHARM') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: RAMESH CARPENTER
        INSERT INTO public.vendors (name) VALUES ('RAMESH CARPENTER') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
    -- SITE: GRT PURASAIVAKAM
    INSERT INTO public.sites (name) VALUES ('GRT PURASAIVAKAM') RETURNING id INTO site_id;
        -- Vendor: MODERN INTERIOR MUNNA
        INSERT INTO public.vendors (name) VALUES ('MODERN INTERIOR MUNNA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/', 103842) RETURNING id INTO wo_id;
        -- Vendor: DHARMENDAR SHARM
        INSERT INTO public.vendors (name) VALUES ('DHARMENDAR SHARM') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/25/25-26', 197400) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 60000, NULL);
        -- Vendor: BABU (BENGAL DECORS)
        INSERT INTO public.vendors (name) VALUES ('BABU (BENGAL DECORS)') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/24/25-26', 0) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 60000, NULL);
    -- SITE: VENKATESAN STREET
    INSERT INTO public.sites (name) VALUES ('VENKATESAN STREET') RETURNING id INTO site_id;
        -- Vendor: RAJENDRA KUMAR VARMA
        INSERT INTO public.vendors (name) VALUES ('RAJENDRA KUMAR VARMA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: DOODHNATH GUPTA
        INSERT INTO public.vendors (name) VALUES ('DOODHNATH GUPTA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: BABU (BENGAL DECORS)
        INSERT INTO public.vendors (name) VALUES ('BABU (BENGAL DECORS)') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
    -- SITE: GRT HALLMARK
    INSERT INTO public.sites (name) VALUES ('GRT HALLMARK') RETURNING id INTO site_id;
        -- Vendor: RAJENDRA KUMAR VARMA
        INSERT INTO public.vendors (name) VALUES ('RAJENDRA KUMAR VARMA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: DOODHNATH GUPTA
        INSERT INTO public.vendors (name) VALUES ('DOODHNATH GUPTA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: BABU (BENGAL DECORS)
        INSERT INTO public.vendors (name) VALUES ('BABU (BENGAL DECORS)') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
    -- SITE: GUKATPALLY JEWELLERY PHASE 1 1ST FLOOR
    INSERT INTO public.sites (name) VALUES ('GUKATPALLY JEWELLERY PHASE 1 1ST FLOOR') RETURNING id INTO site_id;
        -- Vendor: YOGENDRANATH
        INSERT INTO public.vendors (name) VALUES ('YOGENDRANATH') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/39/25-26', 101100) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 50000, NULL);
        -- Vendor: HUSSAIN ENTERPRISES
        INSERT INTO public.vendors (name) VALUES ('HUSSAIN ENTERPRISES') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/40/25-26', 166126) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 50000, NULL);
        -- Vendor: RAMBHUROASH SHARMA
        INSERT INTO public.vendors (name) VALUES ('RAMBHUROASH SHARMA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/38/25-26', 897371) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 100000, NULL);
    -- SITE: GRT MALLESWARAM
    INSERT INTO public.sites (name) VALUES ('GRT MALLESWARAM') RETURNING id INTO site_id;
        -- Vendor: SKY TECH (SRIDHAR)
        INSERT INTO public.vendors (name) VALUES ('SKY TECH (SRIDHAR)') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/NOV/32/25-26', 489500) RETURNING id INTO wo_id;
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 146850, NULL);
        INSERT INTO public.advances (work_order_id, amount, date) VALUES (wo_id, 54840, NULL);
        -- Vendor: DOODHNATH GUPTA
        INSERT INTO public.vendors (name) VALUES ('DOODHNATH GUPTA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: BABU (BENGAL DECORS)
        INSERT INTO public.vendors (name) VALUES ('BABU (BENGAL DECORS)') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, 'IIPL/WO/DEC/', 0) RETURNING id INTO wo_id;
    -- SITE: GRT MAILADUDURAI
    INSERT INTO public.sites (name) VALUES ('GRT MAILADUDURAI') RETURNING id INTO site_id;
        -- Vendor: RAHIM
        INSERT INTO public.vendors (name) VALUES ('RAHIM') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: DOODHNATH
        INSERT INTO public.vendors (name) VALUES ('DOODHNATH') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: RAMESH
        INSERT INTO public.vendors (name) VALUES ('RAMESH') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
    -- SITE: GRT RANGAN STREET
    INSERT INTO public.sites (name) VALUES ('GRT RANGAN STREET') RETURNING id INTO site_id;
        -- Vendor: RAJENDRA KUMAR VARMA
        INSERT INTO public.vendors (name) VALUES ('RAJENDRA KUMAR VARMA') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: DOODHNATH
        INSERT INTO public.vendors (name) VALUES ('DOODHNATH') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: BABU
        INSERT INTO public.vendors (name) VALUES ('BABU') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
    -- SITE: GRT GUNDUR
    INSERT INTO public.sites (name) VALUES ('GRT GUNDUR') RETURNING id INTO site_id;
        -- Vendor: RAHIM
        INSERT INTO public.vendors (name) VALUES ('RAHIM') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: RANJAN
        INSERT INTO public.vendors (name) VALUES ('RANJAN') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
        -- Vendor: BABU
        INSERT INTO public.vendors (name) VALUES ('BABU') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vendor_id;
        INSERT INTO public.work_orders (site_id, vendor_id, wo_no, wo_value) VALUES (site_id, vendor_id, '', 0) RETURNING id INTO wo_id;
END $$;

ALTER TABLE advances 
ADD COLUMN payment_mode TEXT;




-- Create Sites Table
create table public.sites (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Create Vendors Table
create table public.vendors (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Create Work Orders Table
create table public.work_orders (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  vendor_id uuid references public.vendors(id) on delete cascade not null,
  wo_no text,
  wo_value numeric default 0,
  wo_pdf_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Create Advances Table
create table public.advances (
  id uuid default gen_random_uuid() primary key,
  work_order_id uuid references public.work_orders(id) on delete cascade not null,
  amount numeric default 0,
  date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Enable RLS (Row Level Security) - Optional but recommended
alter table public.sites enable row level security;
alter table public.vendors enable row level security;
alter table public.work_orders enable row level security;
alter table public.advances enable row level security;
-- Create Policies (Public Read/Write for simplicity since no auth is implemented yet)
create policy "Public Access Sites" on public.sites for all using (true) with check (true);
create policy "Public Access Vendors" on public.vendors for all using (true) with check (true);
create policy "Public Access Work Orders" on public.work_orders for all using (true) with check (true);
create policy "Public Access Advances" on public.advances for all using (true) with check (true);


-- UPDATE: Add PDF Upload Support
-- Run these commands to update your existing database

-- 1. Add the column to the existing table
ALTER TABLE public.work_orders 
ADD COLUMN wo_pdf_url TEXT;

-- 2. Create the Storage Bucket for PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-orders', 'work-orders', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow public access to the new bucket
CREATE POLICY "Public Access Work Orders Bucket"
ON storage.objects FOR ALL
USING ( bucket_id = 'work-orders' )
WITH CHECK ( bucket_id = 'work-orders' );


