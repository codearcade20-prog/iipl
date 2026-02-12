-- 1. Ensure app_settings table has full access
DROP POLICY IF EXISTS "Allow all access to app_settings" ON app_settings;
CREATE POLICY "Allow all access to app_settings" ON app_settings 
FOR ALL USING (true) WITH CHECK (true);

-- 2. Ensure signatures bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Allow everyone to upload to the signatures bucket
-- (Supabase Storage uses the 'storage.objects' table)
DROP POLICY IF EXISTS "Allow public uploads to signatures" ON storage.objects;
CREATE POLICY "Allow public uploads to signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signatures');

-- 4. Allow everyone to update/upsert (for overwrites or metadata)
DROP POLICY IF EXISTS "Allow public updates to signatures" ON storage.objects;
CREATE POLICY "Allow public updates to signatures"
ON storage.objects FOR UPDATE
USING (bucket_id = 'signatures');

-- 5. Allow everyone to read from signatures bucket
DROP POLICY IF EXISTS "Allow public read from signatures" ON storage.objects;
CREATE POLICY "Allow public read from signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures');
