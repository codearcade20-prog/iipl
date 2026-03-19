-- SQL Migration: Add bill_status column to work_orders table
-- Run this in your Supabase SQL Editor

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS bill_status TEXT DEFAULT 'N/A';

-- Optional: Update existing records to 'N/A' if needed
-- UPDATE work_orders SET bill_status = 'N/A' WHERE bill_status IS NULL;
