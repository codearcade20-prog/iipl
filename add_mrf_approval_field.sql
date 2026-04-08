-- Add mrf_approval column to status tables
ALTER TABLE public.project_status_updates 
ADD COLUMN IF NOT EXISTS mrf_approval NUMERIC DEFAULT 0;

ALTER TABLE public.project_current_status 
ADD COLUMN IF NOT EXISTS mrf_approval NUMERIC DEFAULT 0;
