-- Add wage_category to labor_attendance_wages table
ALTER TABLE public.labor_attendance_wages 
ADD COLUMN IF NOT EXISTS wage_category TEXT DEFAULT 'Direct wages';

-- If existing data should have a default
UPDATE public.labor_attendance_wages SET wage_category = 'Direct wages' WHERE wage_category IS NULL;
