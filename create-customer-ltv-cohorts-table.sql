-- Create customer_ltv_cohorts table for storing customer lifetime value cohort analysis
-- This table tracks how much each customer cohort spends/profits month over month

CREATE TABLE IF NOT EXISTS customer_ltv_cohorts (
    id SERIAL PRIMARY KEY,
    store_id TEXT NOT NULL,
    cohort_month TEXT NOT NULL, -- e.g., "2025-02" for Feb 2025
    months_since_first INTEGER NOT NULL, -- 0, 1, 2, 3, 4, 5, 6...
    customer_count INTEGER NOT NULL, -- number of customers in this cohort
    total_revenue DECIMAL(10,2), -- total revenue for this cohort in this month
    total_profit DECIMAL(10,2), -- total profit for this cohort in this month
    avg_revenue_per_customer DECIMAL(10,2), -- revenue per customer
    avg_profit_per_customer DECIMAL(10,2), -- profit per customer
    cac DECIMAL(10,2), -- customer acquisition cost
    retention_rate DECIMAL(5,2), -- retention percentage
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique records per store, cohort, and month
);

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_customer_ltv_cohorts_updated_at
    BEFORE UPDATE ON customer_ltv_cohorts
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_ltv_cohorts_updated_at();

-- Example of how data will be structured:
-- INSERT INTO customer_ltv_cohorts (store_id, cohort_month, months_since_first, customer_count, avg_revenue_per_customer, avg_profit_per_customer, cac, retention_rate) VALUES
-- ('buycosari', '2025-02', 0, 627, 80.00, 20.00, 60.00, 100.0),
-- ('buycosari', '2025-02', 1, 232, 89.00, 22.25, 60.00, 37.0),
-- ('buycosari', '2025-02', 2, 86, 95.00, 23.75, 60.00, 13.7),
-- ('buycosari', '2025-03', 0, 1945, 77.00, 19.25, 60.00, 100.0),
-- ('buycosari', '2025-03', 1, 758, 85.00, 21.25, 60.00, 39.0);
