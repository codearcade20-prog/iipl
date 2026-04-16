-- Add new columns for storing calculated and raw data
ALTER TABLE labor_attendance_wages 
ADD COLUMN calculated_attendance_value numeric(10,3),
ADD COLUMN raw_wages_amount numeric(10,2);
