-- 1. Remove site_id from labors table (as they move between sites daily)
ALTER TABLE public.labors DROP COLUMN IF EXISTS site_id;

-- 2. Ensure labor_attendance_wages has site_id and it is required
-- (In case it was previously nullable or using outdated schema)
ALTER TABLE public.labor_attendance_wages ALTER COLUMN site_id SET NOT NULL;

-- 3. Cleanup: If site_engineers table still exists, ensure everything transitioned
-- (The user said they'd delete it, but let's be safe)
-- DROP TABLE IF EXISTS public.site_engineers;
