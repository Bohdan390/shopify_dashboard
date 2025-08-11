-- Functions for Customer LTV Cohort Analysis
-- These functions calculate and populate customer lifetime value data by cohorts

-- Function to calculate customer LTV cohorts for a given date range
CREATE OR REPLACE FUNCTION calculate_customer_ltv_cohorts(
    p_store_id TEXT,
    p_start_date TEXT,
    p_end_date TEXT
)
RETURNS VOID AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_cohort_month TEXT;
    v_months_since_first INTEGER;
    v_customer_count INTEGER;
    v_total_revenue DECIMAL(10,2);
    v_total_profit DECIMAL(10,2);
    v_avg_revenue_per_customer DECIMAL(10,2);
    v_avg_profit_per_customer DECIMAL(10,2);
    v_cac DECIMAL(10,2);
    v_retention_rate DECIMAL(5,2);
    v_cohort_cursor CURSOR FOR
        SELECT 
            DATE_TRUNC('month', MIN(o.created_at))::TEXT AS cohort_month,
            COUNT(DISTINCT c.customer_id) AS customer_count,
            AVG(o.total_price) AS avg_first_order_value
        FROM customers c
        JOIN orders o ON c.customer_id = o.customer_id
        WHERE c.store_id = p_store_id
            AND o.created_at >= v_start_date
            AND o.created_at <= v_end_date
        GROUP BY DATE_TRUNC('month', MIN(o.created_at))
        ORDER BY cohort_month;
BEGIN
    -- Convert text dates to DATE
    v_start_date := p_start_date::DATE;
    v_end_date := p_end_date::DATE;
    
    -- Clear existing data for the date range
    DELETE FROM customer_ltv_cohorts 
    WHERE store_id = p_store_id 
        AND cohort_month >= p_start_date 
        AND cohort_month <= p_end_date;
    
    -- Process each cohort
    FOR v_cohort_record IN v_cohort_cursor LOOP
        v_cohort_month := v_cohort_record.cohort_month;
        v_customer_count := v_cohort_record.customer_count;
        
        -- Calculate months since first purchase (0 to max possible)
        FOR v_months_since_first IN 0..12 LOOP
            -- Calculate metrics for this month
            SELECT 
                COUNT(DISTINCT c.customer_id),
                COALESCE(SUM(o.total_price), 0),
                COALESCE(SUM(o.total_price - COALESCE(o.total_tax, 0) - COALESCE(o.total_discounts, 0)), 0)
            INTO 
                v_customer_count,
                v_total_revenue,
                v_total_profit
            FROM customers c
            JOIN orders o ON c.customer_id = o.customer_id
            WHERE c.store_id = p_store_id
                AND DATE_TRUNC('month', c.first_order_date)::TEXT = v_cohort_month
                AND DATE_TRUNC('month', o.created_at)::TEXT = (
                    (DATE_TRUNC('month', c.first_order_date) + INTERVAL '1 month' * v_months_since_first)::TEXT
                );
            
            -- Calculate averages
            IF v_customer_count > 0 THEN
                v_avg_revenue_per_customer := v_total_revenue / v_customer_count;
                v_avg_profit_per_customer := v_total_profit / v_customer_count;
                
                -- Calculate retention rate (customers who ordered this month vs original cohort)
                SELECT 
                    ROUND(
                        (COUNT(DISTINCT c.customer_id)::DECIMAL / 
                         (SELECT COUNT(DISTINCT customer_id) 
                          FROM customers 
                          WHERE store_id = p_store_id 
                            AND DATE_TRUNC('month', first_order_date)::TEXT = v_cohort_month)) * 100, 1
                    )
                INTO v_retention_rate
                FROM customers c
                JOIN orders o ON c.customer_id = o.customer_id
                WHERE c.store_id = p_store_id
                    AND DATE_TRUNC('month', c.first_order_date)::TEXT = v_cohort_month
                    AND DATE_TRUNC('month', o.created_at)::TEXT = (
                        (DATE_TRUNC('month', c.first_order_date) + INTERVAL '1 month' * v_months_since_first)::TEXT
                    );
                
                -- Estimate CAC (you may want to adjust this based on your actual CAC data)
                v_cac := 60.00; -- Default CAC, adjust as needed
                
                -- Insert the cohort data
                INSERT INTO customer_ltv_cohorts (
                    store_id, cohort_month, months_since_first, customer_count,
                    total_revenue, total_profit, avg_revenue_per_customer, 
                    avg_profit_per_customer, cac, retention_rate
                ) VALUES (
                    p_store_id, v_cohort_month, v_months_since_first, v_customer_count,
                    v_total_revenue, v_total_profit, v_avg_revenue_per_customer,
                    v_avg_profit_per_customer, v_cac, v_retention_rate
                );
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Customer LTV cohorts calculated for store % from % to %', p_store_id, p_start_date, p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer LTV cohorts for display
CREATE OR REPLACE FUNCTION get_customer_ltv_cohorts(
    p_store_id TEXT,
    p_start_date TEXT,
    p_end_date TEXT,
    p_metric TEXT DEFAULT 'revenue'
)
RETURNS TABLE (
    cohort_month TEXT,
    cohort_month_display TEXT,
    month0 DECIMAL(10,2),
    month1 DECIMAL(10,2),
    month2 DECIMAL(10,2),
    month3 DECIMAL(10,2),
    month4 DECIMAL(10,2),
    month5 DECIMAL(10,2),
    month6 DECIMAL(10,2),
    total_value DECIMAL(10,2),
    customer_count INTEGER,
    cac DECIMAL(10,2),
    retention_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        clc.cohort_month,
        TO_CHAR(TO_DATE(clc.cohort_month, 'YYYY-MM'), 'Mon YYYY') AS cohort_month_display,
        MAX(CASE WHEN clc.months_since_first = 0 THEN 
            CASE WHEN p_metric = 'profit' THEN clc.avg_profit_per_customer ELSE clc.avg_revenue_per_customer END
        END) AS month0,
        MAX(CASE WHEN clc.months_since_first = 1 THEN 
            CASE WHEN p_metric = 'profit' THEN clc.avg_profit_per_customer ELSE clc.avg_revenue_per_customer END
        END) AS month1,
        MAX(CASE WHEN clc.months_since_first = 2 THEN 
            CASE WHEN p_metric = 'profit' THEN clc.avg_profit_per_customer ELSE clc.avg_revenue_per_customer END
        END) AS month2,
        MAX(CASE WHEN clc.months_since_first = 3 THEN 
            CASE WHEN p_metric = 'profit' THEN clc.avg_profit_per_customer ELSE clc.avg_revenue_per_customer END
        END) AS month3,
        MAX(CASE WHEN clc.months_since_first = 4 THEN 
            CASE WHEN p_metric = 'profit' THEN clc.avg_profit_per_customer ELSE clc.avg_revenue_per_customer END
        END) AS month4,
        MAX(CASE WHEN clc.months_since_first = 5 THEN 
            CASE WHEN p_metric = 'profit' THEN clc.avg_profit_per_customer ELSE clc.avg_revenue_per_customer END
        END) AS month5,
        MAX(CASE WHEN clc.months_since_first = 6 THEN 
            CASE WHEN p_metric = 'profit' THEN clc.avg_profit_per_customer ELSE clc.avg_revenue_per_customer END
        END) AS month6,
        SUM(CASE WHEN p_metric = 'profit' THEN clc.avg_profit_per_customer ELSE clc.avg_revenue_per_customer END) AS total_value,
        MAX(clc.customer_count) AS customer_count,
        MAX(clc.cac) AS cac,
        MAX(clc.retention_rate) AS retention_rate
    FROM customer_ltv_cohorts clc
    WHERE clc.store_id = p_store_id
        AND clc.cohort_month >= p_start_date
        AND clc.cohort_month <= p_end_date
    GROUP BY clc.cohort_month
    ORDER BY clc.cohort_month DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to sync customer LTV data (called from API)
CREATE OR REPLACE FUNCTION sync_customer_ltv_cohorts(
    p_store_id TEXT,
    p_start_date TEXT,
    p_end_date TEXT
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    BEGIN
        -- Calculate the cohorts
        PERFORM calculate_customer_ltv_cohorts(p_store_id, p_start_date, p_end_date);
        
        -- Return success
        v_result := json_build_object(
            'success', true,
            'message', 'Customer LTV cohorts calculated successfully',
            'store_id', p_store_id,
            'start_date', p_start_date,
            'end_date', p_end_date
        );
    EXCEPTION WHEN OTHERS THEN
        -- Return error
        v_result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'store_id', p_store_id,
            'start_date', p_start_date,
            'end_date', p_end_date
        );
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
