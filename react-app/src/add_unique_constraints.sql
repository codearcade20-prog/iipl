-- Add unique constraints to prevent duplicate identities
ALTER TABLE public.employees 
ADD CONSTRAINT unique_email UNIQUE (email),
ADD CONSTRAINT unique_pan_no UNIQUE (pan_no),
ADD CONSTRAINT unique_phone UNIQUE (phone);
