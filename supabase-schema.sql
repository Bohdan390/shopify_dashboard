-- Shopify Dashboard Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_of_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics ENABLE ROW LEVEL SECURITY;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  shopify_order_id VARCHAR(255) UNIQUE NOT NULL,
  order_number VARCHAR(255),
  total_price DECIMAL(10,2),
  subtotal_price DECIMAL(10,2),
  total_tax DECIMAL(10,2),
  total_discounts DECIMAL(10,2),
  currency VARCHAR(10),
  financial_status VARCHAR(50),
  fulfillment_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  customer_email VARCHAR(255),
  customer_id VARCHAR(255)
);

-- Create ad_spend table
CREATE TABLE IF NOT EXISTS ad_spend (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  campaign_name VARCHAR(255),
  spend_amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create cost_of_goods table
CREATE TABLE IF NOT EXISTS cost_of_goods (
  id BIGSERIAL PRIMARY KEY,
  product_id VARCHAR(255),
  product_title VARCHAR(255),
  cost_per_unit DECIMAL(10,2),
  quantity INTEGER,
  total_cost DECIMAL(10,2),
  date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  revenue DECIMAL(10,2) DEFAULT 0,
  google_ads_spend DECIMAL(10,2) DEFAULT 0,
  facebook_ads_spend DECIMAL(10,2) DEFAULT 0,
  cost_of_goods DECIMAL(10,2) DEFAULT 0,
  profit DECIMAL(10,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ad Spend Tracking Tables
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(255) UNIQUE NOT NULL,
    campaign_name VARCHAR(500) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'facebook' or 'google'
    account_id VARCHAR(255) NOT NULL,
    store_id VARCHAR(255), -- Maps to specific store
    product_id VARCHAR(255), -- Maps to specific product
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_spend_detailed (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'facebook' or 'google'
    spend_amount DECIMAL(10,2) NOT NULL,
    impressions INTEGER,
    clicks INTEGER,
    conversions INTEGER,
    conversion_value DECIMAL(10,2),
    store_id VARCHAR(255), -- Maps to specific store
    product_id VARCHAR(255), -- Maps to specific product
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, campaign_id, platform)
);

-- Store and Product Mapping Tables
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(255) UNIQUE NOT NULL,
    store_name VARCHAR(500) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'shopify', 'woocommerce', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(255) UNIQUE NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    store_id VARCHAR(255) NOT NULL,
    sku VARCHAR(255),
    cost_price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- Enhanced Analytics Table with Store/Product Breakdown
CREATE TABLE IF NOT EXISTS analytics_detailed (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    store_id VARCHAR(255),
    product_id VARCHAR(255),
    revenue DECIMAL(10,2) DEFAULT 0,
    google_ads_spend DECIMAL(10,2) DEFAULT 0,
    facebook_ads_spend DECIMAL(10,2) DEFAULT 0,
    cost_of_goods DECIMAL(10,2) DEFAULT 0,
    profit DECIMAL(10,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, store_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_spend_date ON ad_spend(date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_platform ON ad_spend(platform);
CREATE INDEX IF NOT EXISTS idx_cost_of_goods_date ON cost_of_goods(date);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_date ON ad_spend_detailed(date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_campaign ON ad_spend_detailed(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_store_product ON ad_spend_detailed(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_detailed_date ON analytics_detailed(date);
CREATE INDEX IF NOT EXISTS idx_analytics_detailed_store_product ON analytics_detailed(store_id, product_id);

-- Create RLS policies (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on ad_spend" ON ad_spend FOR ALL USING (true);
CREATE POLICY "Allow all operations on cost_of_goods" ON cost_of_goods FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics" ON analytics FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate profit
CREATE OR REPLACE FUNCTION calculate_daily_profit(target_date DATE)
RETURNS TABLE(
  date DATE,
  revenue DECIMAL(10,2),
  google_ads_spend DECIMAL(10,2),
  facebook_ads_spend DECIMAL(10,2),
  cost_of_goods DECIMAL(10,2),
  profit DECIMAL(10,2),
  profit_margin DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    target_date as date,
    COALESCE(SUM(o.total_price), 0) as revenue,
    COALESCE(SUM(CASE WHEN a.platform = 'google' THEN a.spend_amount ELSE 0 END), 0) as google_ads_spend,
    COALESCE(SUM(CASE WHEN a.platform = 'facebook' THEN a.spend_amount ELSE 0 END), 0) as facebook_ads_spend,
    COALESCE(SUM(c.total_cost), 0) as cost_of_goods,
    COALESCE(SUM(o.total_price), 0) - 
    COALESCE(SUM(a.spend_amount), 0) - 
    COALESCE(SUM(c.total_cost), 0) as profit,
    CASE 
      WHEN COALESCE(SUM(o.total_price), 0) > 0 
      THEN ((COALESCE(SUM(o.total_price), 0) - COALESCE(SUM(a.spend_amount), 0) - COALESCE(SUM(c.total_cost), 0)) / COALESCE(SUM(o.total_price), 0)) * 100
      ELSE 0 
    END as profit_margin
  FROM 
    (SELECT target_date) as d
    LEFT JOIN orders o ON DATE(o.created_at) = target_date
    LEFT JOIN ad_spend a ON a.date = target_date
    LEFT JOIN cost_of_goods c ON c.date = target_date
  GROUP BY target_date;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional)
-- INSERT INTO ad_spend (platform, campaign_name, spend_amount, date) VALUES
--   ('google', 'Test Campaign', 100.00, CURRENT_DATE),
--   ('facebook', 'Test Campaign', 50.00, CURRENT_DATE);

-- INSERT INTO cost_of_goods (product_title, cost_per_unit, quantity, total_cost, date) VALUES
--   ('Test Product', 10.00, 5, 50.00, CURRENT_DATE);

COMMENT ON TABLE orders IS 'Shopify order data';
COMMENT ON TABLE ad_spend IS 'Google and Facebook ad spend data';
COMMENT ON TABLE cost_of_goods IS 'Product cost data';
COMMENT ON TABLE analytics IS 'Calculated daily profit analytics';

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated; 