-- Add food_deduction column to payrolls table
ALTER TABLE public.payrolls ADD COLUMN IF NOT EXISTS food_deduction NUMERIC DEFAULT 0;
