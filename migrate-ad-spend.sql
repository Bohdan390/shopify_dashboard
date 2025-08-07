-- Migration script to move data from ad_spend to ad_spend_detailed
-- Run this in Supabase SQL Editor after updating your schema

-- First, let's check if ad_spend table exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ad_spend') THEN
    -- Check if there's data in ad_spend table
    IF EXISTS (SELECT 1 FROM ad_spend LIMIT 1) THEN
      RAISE NOTICE 'Found data in ad_spend table. Migrating to ad_spend_detailed...';
      
      -- Insert data from ad_spend to ad_spend_detailed
      INSERT INTO ad_spend_detailed (
        date,
        campaign_id,
        platform,
        spend_amount,
        impressions,
        clicks,
        conversions,
        conversion_value,
        store_id,
        product_id,
        created_at,
        updated_at
      )
      SELECT 
        date,
        campaign_name as campaign_id, -- Use campaign_name as campaign_id for legacy data
        platform,
        spend_amount,
        NULL as impressions, -- Legacy data doesn't have these metrics
        NULL as clicks,
        NULL as conversions,
        NULL as conversion_value,
        NULL as store_id, -- Legacy data doesn't have store mapping
        NULL as product_id, -- Legacy data doesn't have product mapping
        created_at,
        NOW() as updated_at
      FROM ad_spend
      ON CONFLICT (date, campaign_id, platform) DO NOTHING; -- Avoid duplicates
      
      RAISE NOTICE 'Migration completed successfully!';
      
      -- Show migration summary
      RAISE NOTICE 'Migration Summary:';
      RAISE NOTICE '- Records in ad_spend: %', (SELECT COUNT(*) FROM ad_spend);
      RAISE NOTICE '- Records in ad_spend_detailed: %', (SELECT COUNT(*) FROM ad_spend_detailed);
      
    ELSE
      RAISE NOTICE 'ad_spend table exists but is empty. No migration needed.';
    END IF;
    
    -- Drop the old ad_spend table
    DROP TABLE IF EXISTS ad_spend CASCADE;
    RAISE NOTICE 'Dropped old ad_spend table.';
    
  ELSE
    RAISE NOTICE 'ad_spend table does not exist. No migration needed.';
  END IF;
END $$;

-- Verify the migration
SELECT 
  'ad_spend_detailed' as table_name,
  COUNT(*) as record_count
FROM ad_spend_detailed
UNION ALL
SELECT 
  'ad_spend (should be 0)' as table_name,
  COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_name = 'ad_spend'; 