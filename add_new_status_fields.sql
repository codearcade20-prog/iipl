-- Update project_status_updates table with new fields
ALTER TABLE public.project_status_updates 
ADD COLUMN IF NOT EXISTS site_pooja NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS office_documentation NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS line_drawing NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_revisions NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cutting_plan NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS raw_materials NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS long_lead_materials NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS finishes_accessories NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cutting_panelling NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS assembly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS polishing NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_finishing NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS packing_forwarding NUMERIC DEFAULT 0;

-- Optional: Update existing records to have 0 for these fields (though DEFAULT 0 handles it for new records)
-- UPDATE public.project_status_updates SET 
-- site_pooja = COALESCE(site_pooja, 0),
-- office_documentation = COALESCE(office_documentation, 0),
-- ... and so on
