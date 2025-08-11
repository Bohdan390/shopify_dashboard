-- Fix analytics table unique constraint to include store_id
-- This allows multiple stores to have analytics for the same date

-- First, drop the existing unique constraint on date
ALTER TABLE analytics DROP CONSTRAINT IF EXISTS analytics_date_key;

-- Add a new composite unique constraint on date and store_id
ALTER TABLE analytics ADD CONSTRAINT analytics_date_store_unique UNIQUE (date, store_id);

-- Verify the change
SELECT 
    constraint_name, 
    constraint_type, 
    table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'analytics' 
AND constraint_type = 'UNIQUE';
