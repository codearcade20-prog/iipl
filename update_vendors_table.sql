-- SQL Script to add extra fields to the vendors table
-- Run this in your Supabase SQL Editor

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS vendor_company TEXT,
ADD COLUMN IF NOT EXISTS aadhaar_no TEXT,
ADD COLUMN IF NOT EXISTS gst_no TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT;
