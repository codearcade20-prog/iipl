-- Add team_role column to app_users table
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS team_role TEXT;

-- Recommended: Update existing admin to have 'admin' role if needed
-- UPDATE public.app_users SET team_role = 'admin' WHERE username = 'admin';
