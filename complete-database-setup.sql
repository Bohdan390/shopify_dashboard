-- =====================================================
-- COMPLETE SHOPIFY DASHBOARD DATABASE SETUP
-- =====================================================
-- This file contains all database schema, functions, and updates
-- Run this in Supabase SQL Editor to set up your complete database

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ad_spend_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_of_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaign_roi ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- Orders Table
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
  customer_id VARCHAR(255),
  store_id VARCHAR(255)
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(255) UNIQUE NOT NULL,
    product_title VARCHAR(500) NOT NULL,
    product_type VARCHAR(255),
    vendor VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Line Items Table
CREATE TABLE IF NOT EXISTS order_line_items (
  id BIGSERIAL PRIMARY KEY,
  shopify_order_id VARCHAR(255) NOT NULL,
  store_id VARCHAR(255) NOT NULL,
  financial_status VARCHAR(255) NOT NULL,
  line_item_id VARCHAR(255) UNIQUE NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  product_title VARCHAR(255),
  variant_id VARCHAR(255),
  variant_title VARCHAR(255),
  sku VARCHAR(255),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(line_item_id)
);

-- Cost of Goods Table
CREATE TABLE IF NOT EXISTS cost_of_goods (
  id BIGSERIAL PRIMARY KEY,
  product_id VARCHAR(255),
  product_title VARCHAR(255),
  cost_per_unit DECIMAL(10,2),
  quantity INTEGER,
  total_cost DECIMAL(10,2),
  date DATE,
  store_id VARCHAR(255),
  product_sku_id VARCHAR(255),
  country_costs JSONB DEFAULT '{}', -- New field for country-specific costs
  created_at TIMESTAMP DEFAULT NOW()
);

-- Country Costs Table (for detailed country-specific cost management)
CREATE TABLE IF NOT EXISTS country_costs (
  id BIGSERIAL PRIMARY KEY,
  store_id VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  country_code VARCHAR(10) NOT NULL, -- ISO country code (US, GB, DE, etc.)
  cost_of_goods DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentage (e.g., 20.00 for 20%)
  tariff_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentage
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of store, product, and country
  UNIQUE(store_id, product_id, country_code)
);

-- Countries Reference Table
CREATE TABLE IF NOT EXISTS countries (
  country_code VARCHAR(10) PRIMARY KEY,
  country_name VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common countries
INSERT INTO countries (country_code, country_name, region) VALUES
('US', 'United States', 'North America'),
('CA', 'Canada', 'North America'),
('GB', 'United Kingdom', 'Europe'),
('DE', 'Germany', 'Europe'),
('FR', 'France', 'Europe'),
('IT', 'Italy', 'Europe'),
('ES', 'Spain', 'Europe'),
('NL', 'Netherlands', 'Europe'),
('AU', 'Australia', 'Oceania'),
('JP', 'Japan', 'Asia'),
('CN', 'China', 'Asia'),
('IN', 'India', 'Asia'),
('BR', 'Brazil', 'South America'),
('MX', 'Mexico', 'North America')
ON CONFLICT (country_code) DO NOTHING;

-- Analytics Table
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

-- Ad Campaigns Table
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(255) UNIQUE NOT NULL,
    campaign_name VARCHAR(500) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    store_id VARCHAR(255),
    product_id VARCHAR(255),
    country_code VARCHAR(10) REFERENCES countries(country_code),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Campaign Links Table
CREATE TABLE IF NOT EXISTS product_campaign_links (
    id SERIAL PRIMARY KEY,
    product_sku VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(500) NOT NULL,
    store_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_sku, campaign_id)
);

-- Campaign ROI Table
CREATE TABLE IF NOT EXISTS campaign_roi (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(500) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    revenue DECIMAL(10,2) DEFAULT 0,
    cost_of_goods DECIMAL(10,2) DEFAULT 0,
    ad_spend DECIMAL(10,2) DEFAULT 0,
    profit DECIMAL(10,2) DEFAULT 0,
    roi_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);

-- Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(255) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    store_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad Spend Detailed Table
CREATE TABLE IF NOT EXISTS ad_spend_detailed (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    spend_amount DECIMAL(10,2) NOT NULL,
    impressions INTEGER,
    clicks INTEGER,
    conversions INTEGER,
    conversion_value DECIMAL(10,2),
    store_id VARCHAR(255),
    product_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    customer_id VARCHAR(255) UNIQUE NOT NULL,
    store_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(255),
    orders_count INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    address1 VARCHAR(500),
    address2 VARCHAR(500),
    city VARCHAR(255),
    province VARCHAR(255),
    country VARCHAR(255),
    zip VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_line_items_product_id ON order_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_shopify_order_id ON order_line_items(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_cost_of_goods_date ON cost_of_goods(date);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_id ON ad_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_country ON ad_campaigns(country_code);
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_date ON ad_spend_detailed(date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_campaign ON ad_spend_detailed(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_store_product ON ad_spend_detailed(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_campaign_roi_campaign_id ON campaign_roi(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_roi_date ON campaign_roi(date);
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_line_items" ON order_line_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on cost_of_goods" ON cost_of_goods FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics" ON analytics FOR ALL USING (true);
CREATE POLICY "Allow all operations on ad_campaigns" ON ad_campaigns FOR ALL USING (true);
CREATE POLICY "Allow all operations on ad_spend_detailed" ON ad_spend_detailed FOR ALL USING (true);
CREATE POLICY "Allow all operations on campaign_roi" ON campaign_roi FOR ALL USING (true);
CREATE POLICY "Allow all operations on stores" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true);

-- =====================================================
-- 5. CREATE TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update updated_at function
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

CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON ad_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_spend_detailed_updated_at BEFORE UPDATE ON ad_spend_detailed
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_roi_updated_at BEFORE UPDATE ON campaign_roi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CREATE CUSTOMER ANALYTICS FUNCTIONS
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_customer_analytics(VARCHAR, VARCHAR, INTEGER, INTEGER, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_customer_analytics(VARCHAR, VARCHAR, INTEGER, INTEGER);

-- Customer Analytics RPC Function
CREATE OR REPLACE FUNCTION get_customer_analytics(
    p_store_id VARCHAR DEFAULT NULL,
    p_search_email VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_field VARCHAR DEFAULT 'total_orders_price',
    p_sort_direction VARCHAR DEFAULT 'desc'
)
RETURNS TABLE (
    customer_id VARCHAR,
    store_id VARCHAR,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    phone VARCHAR,
    orders_count INTEGER,
    total_paid DECIMAL(10,2),
    total_orders_price DECIMAL(10,2),
    total_discounts DECIMAL(10,2),
    total_tax DECIMAL(10,2),
    net_revenue DECIMAL(10,2),
    average_order_value DECIMAL(10,2),
    address1 VARCHAR,
    address2 VARCHAR,
    city VARCHAR,
    province VARCHAR,
    country VARCHAR,
    zip VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH customer_analytics AS (
        SELECT 
            c.customer_id,
            c.store_id,
            c.email,
            c.first_name,
            c.last_name,
            c.phone,
            COUNT(o.id)::INTEGER as orders_count,
            COALESCE(SUM(CASE WHEN o.financial_status = 'paid' THEN o.total_price ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(o.total_price), 0) as total_orders_price,
            COALESCE(SUM(o.total_discounts), 0) as total_discounts,
            COALESCE(SUM(o.total_tax), 0) as total_tax,
            COALESCE(SUM(CASE WHEN o.financial_status = 'paid' THEN o.total_price ELSE 0 END), 0) - 
            COALESCE(SUM(o.total_discounts), 0) - 
            COALESCE(SUM(o.total_tax), 0) as net_revenue,
            CASE 
                WHEN COUNT(o.id) > 0 THEN (COALESCE(SUM(o.total_price), 0) - COALESCE(SUM(o.total_discounts), 0) - COALESCE(SUM(o.total_tax), 0)) / COUNT(o.id)
                ELSE 0 
            END as average_order_value,
            c.address1,
            c.address2,
            c.city,
            c.province,
            c.country,
            c.zip,
            c.created_at,
            c.updated_at
        FROM customers c
        LEFT JOIN orders o ON c.customer_id = o.customer_id AND c.store_id = o.store_id
        WHERE 
            (p_store_id IS NULL OR c.store_id = p_store_id)
            AND (p_search_email IS NULL OR c.email ILIKE '%' || p_search_email || '%')
        GROUP BY 
            c.customer_id, c.store_id, c.email, c.first_name, c.last_name, c.phone,
            c.address1, c.address2, c.city, c.province,
            c.country, c.zip, c.created_at, c.updated_at
    )
    SELECT * FROM customer_analytics ca
    ORDER BY 
        CASE WHEN p_sort_field = 'first_name' AND p_sort_direction = 'asc' THEN ca.first_name END ASC,
        CASE WHEN p_sort_field = 'first_name' AND p_sort_direction = 'desc' THEN ca.first_name END DESC,
        CASE WHEN p_sort_field = 'orders_count' AND p_sort_direction = 'asc' THEN ca.orders_count END ASC,
        CASE WHEN p_sort_field = 'orders_count' AND p_sort_direction = 'desc' THEN ca.orders_count END DESC,
        CASE WHEN p_sort_field = 'total_orders_price' AND p_sort_direction = 'asc' THEN ca.total_orders_price END ASC,
        CASE WHEN p_sort_field = 'total_orders_price' AND p_sort_direction = 'desc' THEN ca.total_orders_price END DESC,
        CASE WHEN p_sort_field = 'net_revenue' AND p_sort_direction = 'asc' THEN ca.net_revenue END ASC,
        CASE WHEN p_sort_field = 'net_revenue' AND p_sort_direction = 'desc' THEN ca.net_revenue END DESC,
        ca.total_orders_price DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE PRODUCT ANALYTICS FUNCTIONS
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS aggregate_product_revenue(TIMESTAMP, TIMESTAMP, VARCHAR);

-- Product Revenue Aggregation Function
CREATE OR REPLACE FUNCTION aggregate_product_revenue(
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP,
  p_store_id VARCHAR,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  product_id TEXT,
  product_title TEXT,
  product_sku_id TEXT,
  total_revenue DECIMAL(10,2),
  order_count INTEGER,
  total_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MIN(oli.product_id)::TEXT as product_id,
    MIN(oli.product_title)::TEXT as product_title,
    CASE 
      WHEN oli.sku LIKE '%-%-%' THEN 
        SPLIT_PART(oli.sku, '-', 1) || '-' || SPLIT_PART(oli.sku, '-', 2)
      ELSE 
        oli.sku
    END::TEXT AS product_sku_id,
    COALESCE(SUM(oli.total_price), 0) AS total_revenue,
    COUNT(DISTINCT oli.line_item_id)::INTEGER AS order_count,
    COUNT(*)::INTEGER AS total_count
  FROM order_line_items oli
  WHERE oli.created_at BETWEEN p_start_date AND p_end_date
    AND oli.financial_status = 'paid'
    AND oli.store_id = p_store_id
  GROUP BY 
    CASE 
      WHEN oli.sku LIKE '%-%-%' THEN 
        SPLIT_PART(oli.sku, '-', 1) || '-' || SPLIT_PART(oli.sku, '-', 2)
      ELSE 
        oli.sku
    END
  ORDER BY total_revenue DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CREATE AD SPEND FUNCTIONS
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS aggregate_ad_spend_by_campaign(TIMESTAMP, TIMESTAMP);

-- Ad Spend by Campaign Function
CREATE OR REPLACE FUNCTION aggregate_ad_spend_by_campaign(
  start_date TIMESTAMP, 
  end_date TIMESTAMP,
  p_campaign_names VARCHAR[] DEFAULT NULL
)
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
    AND (p_campaign_names IS NULL OR asd.campaign_name = ANY(p_campaign_names))
  GROUP BY asd.campaign_id
  ORDER BY total_spend DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. CREATE CAMPAIGN ROI FUNCTIONS
-- =====================================================

-- Campaign ROI Calculation Function
CREATE OR REPLACE FUNCTION calculate_campaign_roi(target_date DATE)
RETURNS TABLE(
  campaign_id VARCHAR(255),
  campaign_name VARCHAR(500),
  platform VARCHAR(50),
  revenue DECIMAL(10,2),
  cost_of_goods DECIMAL(10,2),
  ad_spend DECIMAL(10,2),
  profit DECIMAL(10,2),
  roi_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.campaign_id,
    ac.campaign_name,
    ac.platform,
    COALESCE(SUM(oli.total_price), 0) as revenue,
    COALESCE(SUM(cog.total_cost), 0) as cost_of_goods,
    COALESCE(SUM(asd.spend_amount), 0) as ad_spend,
    COALESCE(SUM(oli.total_price), 0) - COALESCE(SUM(cog.total_cost), 0) - COALESCE(SUM(asd.spend_amount), 0) as profit,
    CASE 
      WHEN COALESCE(SUM(asd.spend_amount), 0) > 0 
      THEN ((COALESCE(SUM(oli.total_price), 0) - COALESCE(SUM(cog.total_cost), 0) - COALESCE(SUM(asd.spend_amount), 0)) / COALESCE(SUM(asd.spend_amount), 0)) * 100
      ELSE 0
    END as roi_percentage
  FROM ad_campaigns ac
  LEFT JOIN order_line_items oli ON oli.product_id = ac.product_id 
    AND DATE(oli.created_at) = target_date
  LEFT JOIN cost_of_goods cog ON cog.product_id = ac.product_id 
    AND cog.date = target_date
  LEFT JOIN ad_spend_detailed asd ON asd.campaign_id = ac.campaign_id 
    AND asd.date = target_date
  WHERE ac.status = 'active'
  GROUP BY ac.campaign_id, ac.campaign_name, ac.platform;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. CREATE DAILY PROFIT FUNCTION
-- =====================================================

-- Daily Profit Calculation Function
CREATE OR REPLACE FUNCTION calculate_daily_profit(target_date DATE)
RETURNS TABLE(
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
    COALESCE(SUM(o.total_price), 0) as revenue,
    COALESCE(SUM(CASE WHEN asd.platform = 'google' THEN asd.spend_amount ELSE 0 END), 0) as google_ads_spend,
    COALESCE(SUM(CASE WHEN asd.platform = 'facebook' THEN asd.spend_amount ELSE 0 END), 0) as facebook_ads_spend,
    COALESCE(SUM(cog.total_cost), 0) as cost_of_goods,
    COALESCE(SUM(o.total_price), 0) - COALESCE(SUM(asd.spend_amount), 0) - COALESCE(SUM(cog.total_cost), 0) as profit,
    CASE 
      WHEN COALESCE(SUM(o.total_price), 0) > 0 
      THEN ((COALESCE(SUM(o.total_price), 0) - COALESCE(SUM(asd.spend_amount), 0) - COALESCE(SUM(cog.total_cost), 0)) / COALESCE(SUM(o.total_price), 0)) * 100
      ELSE 0
    END as profit_margin
  FROM orders o
  LEFT JOIN ad_spend_detailed asd ON asd.date = target_date
  LEFT JOIN cost_of_goods cog ON cog.date = target_date
  WHERE o.financial_status = 'paid' 
    AND DATE(o.created_at) = target_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. CREATE PRODUCT REVENUE BY DATE RANGE FUNCTION
-- =====================================================

-- Product Revenue by Date Range Function
CREATE OR REPLACE FUNCTION aggregate_product_revenue_by_date_range(start_date TIMESTAMP, end_date TIMESTAMP)
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

-- =====================================================
-- 12. CREATE AD SPEND BY CAMPAIGN DATE RANGE FUNCTION
-- =====================================================

-- Ad Spend by Campaign Date Range Function
CREATE OR REPLACE FUNCTION aggregate_ad_spend_by_campaign_date_range(start_date TIMESTAMP, end_date TIMESTAMP)
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

-- =====================================================
-- 13. ADD CUSTOMER FIRST ORDER DATE COLUMN
-- =====================================================

-- Add first_order_date column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_order_date TIMESTAMP WITH TIME ZONE;

-- Add index for better performance when querying by first_order_date
CREATE INDEX IF NOT EXISTS idx_customers_first_order_date ON customers(first_order_date);

-- Update existing customers with their first order date
UPDATE customers 
SET first_order_date = (
    SELECT MIN(o.created_at) 
    FROM orders o 
    WHERE o.customer_id = customers.customer_id 
    AND o.store_id = customers.store_id
)
WHERE first_order_date IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN customers.first_order_date IS 'Date of the customer''s first order';

-- =====================================================
-- 14. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 15. COMMENTS
-- =====================================================

COMMENT ON TABLE orders IS 'Shopify orders data';
COMMENT ON TABLE order_line_items IS 'Product-level order data for campaign ROI calculations';
COMMENT ON TABLE cost_of_goods IS 'Product cost data for profit calculations';
COMMENT ON TABLE analytics IS 'Daily calculated analytics (revenue, spend, profit)';
COMMENT ON TABLE ad_campaigns IS 'Advertising campaigns from Windsor.ai';
COMMENT ON TABLE campaign_roi IS 'Campaign-level ROI calculations';
COMMENT ON TABLE stores IS 'Store management data';
COMMENT ON TABLE products IS 'Product management data';
COMMENT ON TABLE ad_spend_detailed IS 'Detailed advertising spend data with performance metrics';
COMMENT ON TABLE customers IS 'Customer data from Shopify orders';

-- =====================================================
-- 16. SAMPLE CAMPAIGN DATA WITH COUNTRIES
-- =====================================================

-- Insert sample campaigns with country assignments
INSERT INTO ad_campaigns (campaign_id, campaign_name, platform, account_id, store_id, country_code, status) VALUES
('camp_001', 'US Summer Sale', 'google', 'acc_001', 'store_001', 'US', 'active'),
('camp_002', 'UK Winter Campaign', 'facebook', 'acc_001', 'store_001', 'GB', 'active'),
('camp_003', 'Australia Holiday Special', 'google', 'acc_001', 'store_001', 'AU', 'active'),
('camp_004', 'Canada Spring Collection', 'facebook', 'acc_001', 'store_001', 'CA', 'active'),
('camp_005', 'Germany Fashion Week', 'google', 'acc_001', 'store_001', 'DE', 'active')
ON CONFLICT (campaign_id) DO NOTHING;

-- =====================================================
-- 17. CREATE CAMPAIGN ANALYTICS RPC FUNCTION
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_campaign_analytics(TIMESTAMP, TIMESTAMP, VARCHAR, VARCHAR);

-- Campaign Analytics RPC Function
CREATE OR REPLACE FUNCTION get_campaign_analytics(
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_store_id VARCHAR DEFAULT NULL,
    p_platform VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(500),
    platform VARCHAR(50),
    country_code VARCHAR(10),
    total_spend DECIMAL(10,2),
    total_clicks INTEGER,
    total_impressions INTEGER,
    total_conversions INTEGER,
    currency_symbol VARCHAR(10),
    currency_rate DECIMAL(10,4),
    store_id VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.campaign_id,
        ac.campaign_name,
        ac.platform,
        ac.country_code,
        COALESCE(SUM(asd.spend_amount), 0) as total_spend,
        COALESCE(SUM(asd.clicks), 0)::INTEGER as total_clicks,
        COALESCE(SUM(asd.impressions), 0)::INTEGER as total_impressions,
        COALESCE(SUM(asd.conversions), 0)::INTEGER as total_conversions,
        'USD' as currency_symbol,
        1.0 as currency_rate,
        ac.store_id,
        ac.status,
        ac.created_at
    FROM ad_campaigns ac
    LEFT JOIN ad_spend_detailed asd ON ac.campaign_id = asd.campaign_id
        AND asd.date >= p_start_date::date 
        AND asd.date <= p_end_date::date
    WHERE 
        (p_store_id IS NULL OR ac.store_id = p_store_id)
        AND (p_platform IS NULL OR ac.platform = p_platform)
        AND ac.status = 'active'
    GROUP BY 
        ac.campaign_id, 
        ac.campaign_name, 
        ac.platform, 
        ac.country_code, 
        ac.store_id, 
        ac.status, 
        ac.created_at
    ORDER BY total_spend DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Your Shopify Dashboard database is now fully configured
-- All tables, functions, indexes, and policies are in place
-- You can now use the RPC functions for analytics and reporting
