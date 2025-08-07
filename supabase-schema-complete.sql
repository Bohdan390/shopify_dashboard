-- Complete Shopify Dashboard Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ad_spend_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_of_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaign_roi ENABLE ROW LEVEL SECURITY;

-- Create orders table (for Shopify orders)
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

-- Products Table (for product management) - MUST BE CREATED BEFORE order_line_items
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

-- Create order_line_items table (for product-level order data)
CREATE TABLE IF NOT EXISTS order_line_items (
  id BIGSERIAL PRIMARY KEY,
  shopify_order_id VARCHAR(255) NOT NULL,
  financial_status VARCHAR(255) NOT NULL,
  line_item_id VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  product_title VARCHAR(255),
  variant_id VARCHAR(255),
  variant_title VARCHAR(255),
  sku VARCHAR(255),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shopify_order_id, line_item_id)
);

-- Create cost_of_goods table (for profit calculations)
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

-- Create analytics table (for calculated daily analytics)
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

-- Ad Campaigns Table (for Windsor.ai campaigns)
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

-- Manual Product-Campaign Links Table
CREATE TABLE IF NOT EXISTS product_campaign_links (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL,
    product_title VARCHAR(500) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(500) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'facebook', 'google', or 'all'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, campaign_id)
);

-- Campaign ROI Table (for campaign-level ROI calculations)
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

-- Stores Table (for store management)
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(255) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    store_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad Spend Detailed Table (for Windsor.ai daily spend data)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_line_items_product_id ON order_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_shopify_order_id ON order_line_items(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_cost_of_goods_date ON cost_of_goods(date);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_id ON ad_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_date ON ad_spend_detailed(date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_campaign ON ad_spend_detailed(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_detailed_store_product ON ad_spend_detailed(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_campaign_roi_campaign_id ON campaign_roi(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_roi_date ON campaign_roi(date);

-- Create RLS policies (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_line_items" ON order_line_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on cost_of_goods" ON cost_of_goods FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics" ON analytics FOR ALL USING (true);
CREATE POLICY "Allow all operations on ad_campaigns" ON ad_campaigns FOR ALL USING (true);
CREATE POLICY "Allow all operations on ad_spend_detailed" ON ad_spend_detailed FOR ALL USING (true);
CREATE POLICY "Allow all operations on campaign_roi" ON campaign_roi FOR ALL USING (true);
CREATE POLICY "Allow all operations on stores" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true);

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

-- Create function to calculate campaign ROI
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

-- Create function to calculate daily profit
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

-- Comments
COMMENT ON TABLE orders IS 'Shopify orders data';
COMMENT ON TABLE order_line_items IS 'Product-level order data for campaign ROI calculations';
COMMENT ON TABLE cost_of_goods IS 'Product cost data for profit calculations';
COMMENT ON TABLE analytics IS 'Daily calculated analytics (revenue, spend, profit)';
COMMENT ON TABLE ad_campaigns IS 'Advertising campaigns from Windsor.ai';
COMMENT ON TABLE campaign_roi IS 'Campaign-level ROI calculations';
COMMENT ON TABLE stores IS 'Store management data';
COMMENT ON TABLE products IS 'Product management data';
COMMENT ON TABLE ad_spend_detailed IS 'Detailed advertising spend data with performance metrics';

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated; 