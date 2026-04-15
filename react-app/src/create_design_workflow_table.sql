-- Create design_workflow table
CREATE TABLE IF NOT EXISTS public.design_workflow (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    step_1_concept JSONB DEFAULT '{"delegation": false, "line_drawing": false, "architect_meeting": false, "site_visit": false, "site_marking": false, "sample_mockup": false, "mood_board": false}'::jsonb,
    step_2_development JSONB DEFAULT '{"shop_drawing": false, "planning": false, "revisions": false, "final_approval": false}'::jsonb,
    step_3_material JSONB DEFAULT '{"mrf_long_lead": false, "mrf_regular": false}'::jsonb,
    step_4_production JSONB DEFAULT '{"cutting_list": false, "factory_visit": false, "review_validation": false}'::jsonb,
    step_5_installation JSONB DEFAULT '{"knowledge_transfer": false, "site_visit": false}'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.design_workflow ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'design_workflow' AND policyname = 'Allow authenticated users to read') THEN
        CREATE POLICY "Allow authenticated users to read" ON public.design_workflow FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'design_workflow' AND policyname = 'Allow authenticated users to insert') THEN
        CREATE POLICY "Allow authenticated users to insert" ON public.design_workflow FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'design_workflow' AND policyname = 'Allow authenticated users to update') THEN
        CREATE POLICY "Allow authenticated users to update" ON public.design_workflow FOR UPDATE USING (true);
    END IF;
END
$$;
