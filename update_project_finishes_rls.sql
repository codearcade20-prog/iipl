-- Drop the existing policy 
DROP POLICY IF EXISTS "Allow authenticated full access to project_finishes" ON project_finishes;

-- Create the new unrestricted policy that resolves the row-level security error
CREATE POLICY "Allow full access to project_finishes" ON project_finishes FOR ALL USING (true) WITH CHECK (true);
