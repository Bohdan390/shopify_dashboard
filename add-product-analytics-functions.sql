-- Add missing functions for Product Analytics
-- Run this in Supabase SQL Editor

-- Create function to aggregate product revenue by date range
CREATE OR REPLACE FUNCTION aggregate_product_revenue(start_date TIMESTAMP, end_date TIMESTAMP)
RETURNS TABLE(
  product_title VARCHAR(255),
  total_revenue DECIMAL(10,2),
  order_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oli.product_title,
    COALESCE(SUM(oli.total_price), 0) as total_revenue,
    COUNT(DISTINCT oli.shopify_order_id) as order_count
  FROM order_line_items oli
  WHERE oli.created_at >= start_date 
    AND oli.created_at <= end_date
    AND oli.financial_status = 'paid'
  GROUP BY oli.product_title
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to aggregate ad spend by campaign for date range
CREATE OR REPLACE FUNCTION aggregate_ad_spend_by_campaign(start_date TIMESTAMP, end_date TIMESTAMP)
RETURNS TABLE(
  campaign_id VARCHAR(255),
  total_spend DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    asd.campaign_id,
    COALESCE(SUM(asd.spend_amount), 0) as total_spend
  FROM ad_spend_detailed asd
  WHERE asd.date >= start_date::date 
    AND asd.date <= end_date::date
  GROUP BY asd.campaign_id
  ORDER BY total_spend DESC;
END;
$$ LANGUAGE plpgsql; 