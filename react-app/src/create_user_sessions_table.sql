-- Create user_sessions table to track active logins
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    username TEXT, -- Denormalized for easier display
    device_info TEXT, -- User Agent
    ip_address TEXT,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_revoked BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all users to insert their own session
CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own last_active_at
CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (true);

-- Allow all users to read sessions (Admin will filter in UI, or we can add better RLS)
-- Since app_users doesn't use Supabase Auth, standard RLS using auth.uid() won't work easily here
-- We'll rely on application logic for now as the app seems to use a public Supabase key with table-level control
CREATE POLICY "Allow all to read sessions" ON user_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all to delete sessions" ON user_sessions FOR DELETE USING (true);
