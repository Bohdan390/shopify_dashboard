-- Fix the get_orders_price_stats function to properly handle date boundaries
DROP FUNCTION IF EXISTS get_orders_price_stats(TEXT, DATE, DATE);

CREATE OR REPLACE FUNCTION get_orders_price_stats(
    p_store_id TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    store_id TEXT,
    total_orders_price DECIMAL,
    paid_orders_price DECIMAL,
    total_orders_count BIGINT,
    paid_orders_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_store_id as store_id,
    COALESCE(SUM(o.total_price), 0) as total_orders_price,
    COALESCE(SUM(CASE WHEN o.financial_status = 'paid' THEN o.total_price ELSE 0 END), 0) as paid_orders_price,
    COUNT(*) as total_orders_count,
    COUNT(CASE WHEN o.financial_status = 'paid' THEN 1 END) as paid_orders_count
  FROM orders o
  WHERE o.created_at >= p_start_date::timestamp
    AND o.created_at < (p_end_date + INTERVAL '1 day')::timestamp
    AND o.store_id = p_store_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_orders_price_stats(TEXT, DATE, DATE) TO authenticated;

-- Test the function
SELECT * FROM get_orders_price_stats('buycosari', '2024-01-01', '2025-08-08');
