-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    coordinator TEXT,
    start_date DATE,
    end_date DATE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create project_status_updates table
CREATE TABLE IF NOT EXISTS public.project_status_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    status_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_percentage NUMERIC CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    remarks TEXT,
    file_url TEXT,
    username TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_status_updates ENABLE ROW LEVEL SECURITY;

-- Check if policies exist before creating them to avoid errors on reapplying
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow authenticated users to read projects') THEN
        CREATE POLICY "Allow authenticated users to read projects" ON public.projects FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow authenticated users to insert projects') THEN
        CREATE POLICY "Allow authenticated users to insert projects" ON public.projects FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow authenticated users to update projects') THEN
        CREATE POLICY "Allow authenticated users to update projects" ON public.projects FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow authenticated users to delete projects') THEN
        CREATE POLICY "Allow authenticated users to delete projects" ON public.projects FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_status_updates' AND policyname = 'Allow authenticated users to read project_status_updates') THEN
        CREATE POLICY "Allow authenticated users to read project_status_updates" ON public.project_status_updates FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_status_updates' AND policyname = 'Allow authenticated users to insert project_status_updates') THEN
        CREATE POLICY "Allow authenticated users to insert project_status_updates" ON public.project_status_updates FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_status_updates' AND policyname = 'Allow authenticated users to update project_status_updates') THEN
        CREATE POLICY "Allow authenticated users to update project_status_updates" ON public.project_status_updates FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_status_updates' AND policyname = 'Allow authenticated users to delete project_status_updates') THEN
        CREATE POLICY "Allow authenticated users to delete project_status_updates" ON public.project_status_updates FOR DELETE USING (true);
    END IF;
END
$$;
