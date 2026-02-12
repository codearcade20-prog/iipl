-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for all actions (Assuming admin only access for now, or unified access)
CREATE POLICY "Allow all access to app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert initial empty GM signature URL if not exists
INSERT INTO app_settings (setting_key, setting_value)
VALUES ('gm_signature_url', '')
ON CONFLICT (setting_key) DO NOTHING;

-- Instruction for manual storage bucket creation:
-- 1. Go to Supabase Dashboard -> Storage
-- 2. Create a new bucket named 'signatures'
-- 3. Set 'Public' to true
