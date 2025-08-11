-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_customer_analytics(VARCHAR, VARCHAR, INTEGER, INTEGER, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_customer_analytics(VARCHAR, VARCHAR, INTEGER, INTEGER);

-- RPC function to get customer analytics with total order price
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
            CASE 
                WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_price), 0) / COUNT(o.id)
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
        ca.total_orders_price DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_customer_details(VARCHAR, VARCHAR);

-- RPC function to get customer details with order history
CREATE OR REPLACE FUNCTION get_customer_details(
    p_customer_id VARCHAR,
    p_store_id VARCHAR DEFAULT NULL
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
    average_order_value DECIMAL(10,2),
    address1 VARCHAR,
    address2 VARCHAR,
    city VARCHAR,
    province VARCHAR,
    country VARCHAR,
    zip VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    order_history JSON
) AS $$
BEGIN
    RETURN QUERY
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
        CASE 
            WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_price), 0) / COUNT(o.id)
            ELSE 0 
        END as average_order_value,
        c.address1,
        c.address2,
        c.city,
        c.province,
        c.country,
        c.zip,
        c.created_at,
        c.updated_at,
        COALESCE(
            json_agg(
                json_build_object(
                    'order_id', o.shopify_order_id,
                    'order_number', o.order_number,
                    'total_price', o.total_price,
                    'financial_status', o.financial_status,
                    'fulfillment_status', o.fulfillment_status,
                    'created_at', o.created_at
                ) ORDER BY o.created_at DESC
            ) FILTER (WHERE o.shopify_order_id IS NOT NULL),
            '[]'::json
        ) as order_history
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id AND c.store_id = o.store_id
    WHERE 
        c.customer_id = p_customer_id
        AND (p_store_id IS NULL OR c.store_id = p_store_id)
            GROUP BY 
            c.customer_id, c.store_id, c.email, c.first_name, c.last_name, c.phone,
            c.address1, c.address2, c.city, c.province,
            c.country, c.zip, c.created_at, c.updated_at;
END;
$$ LANGUAGE plpgsql;
