CREATE TABLE project_finishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE project_finishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to project_finishes" ON project_finishes FOR ALL USING (true) WITH CHECK (true);
