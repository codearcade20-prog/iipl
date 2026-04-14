-- Add is_approved and is_pending columns to app_users table
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT TRUE;

-- Update existing users to be approved by default
UPDATE public.app_users SET is_approved = TRUE, is_pending = FALSE;
