-- Add Role and Designation columns to behaviors table
ALTER TABLE public.labors 
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT;
