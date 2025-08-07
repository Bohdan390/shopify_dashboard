-- Drop all tables from Supabase database
-- WARNING: This will permanently delete all data!
-- Run this in Supabase SQL Editor

-- Drop all tables in the correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS campaign_roi CASCADE;
DROP TABLE IF EXISTS order_line_items CASCADE;
DROP TABLE IF EXISTS ad_spend_detailed CASCADE;
DROP TABLE IF EXISTS ad_spend CASCADE;
DROP TABLE IF EXISTS ad_campaigns CASCADE;
DROP TABLE IF EXISTS cost_of_goods CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_campaign_roi(DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_daily_profit(DATE) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop indexes (they should be dropped automatically with tables, but just in case)
-- Note: Indexes are automatically dropped when their parent table is dropped

-- Verify all tables are dropped
SELECT 
  table_name,
  'DROPPED' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Should return no rows if all tables were successfully dropped 