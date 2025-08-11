-- Create product_trends table for storing pre-calculated monthly product analytics
-- This table will be updated whenever orders, ads, or cost of goods change

CREATE TABLE IF NOT EXISTS product_trends (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(50) NOT NULL,
    product_sku TEXT NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- '2025-01' format
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0,
    order_count BIGINT DEFAULT 0,
    ad_spend DECIMAL(10,2) DEFAULT 0,
    cost_of_goods DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate entries
    UNIQUE(store_id, product_sku, month_year)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_trends_store_month ON product_trends(store_id, month_year);
CREATE INDEX IF NOT EXISTS idx_product_trends_sku ON product_trends(product_sku);
CREATE INDEX IF NOT EXISTS idx_product_trends_date_range ON product_trends(year, month);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_trends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_product_trends_updated_at
    BEFORE UPDATE ON product_trends
    FOR EACH ROW
    EXECUTE FUNCTION update_product_trends_updated_at();

-- Insert some sample data for testing (optional)
-- INSERT INTO product_trends (store_id, product_sku, month_year, month, year, total_revenue, total_profit, order_count, ad_spend, cost_of_goods)
-- VALUES 
--     ('buycosari', 'Cosari B', '2025-01', 1, 2025, 50000.00, 35000.00, 300, 10000.00, 5000.00),
--     ('buycosari', 'Cosari Epilator', '2025-01', 1, 2025, 25000.00, 17500.00, 150, 5000.00, 2500.00);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON product_trends TO your_user;
-- GRANT USAGE, SELECT ON SEQUENCE product_trends_id_seq TO your_user;
