-- Remove site_id from labors table as they move between sites daily
ALTER TABLE public.labors DROP COLUMN IF EXISTS site_id;

-- Ensure labor_attendance_wages has site_id (it already does, but let's confirm it's NOT NULL for data integrity)
-- Actually let's just make sure it exists
-- ALTER TABLE public.labor_attendance_wages ALTER COLUMN site_id SET NOT NULL;
