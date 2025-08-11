-- Sync missing customers from orders table
-- This script will create customer records for customers that exist in orders but not in customers table

INSERT INTO customers (
    customer_id,
    store_id,
    email,
    first_name,
    last_name,
    phone,
    orders_count,
    total_spent,
    address1,
    address2,
    city,
    province,
    country,
    zip,
    created_at,
    updated_at
)
SELECT DISTINCT
    o.customer_id,
    o.store_id,
    o.customer_email as email,
    'Unknown' as first_name,  -- We don't have this data in orders table
    'Customer' as last_name,   -- We don't have this data in orders table
    NULL as phone,             -- We don't have this data in orders table
    0 as orders_count,         -- Will be calculated by RPC function
    0 as total_spent,          -- Will be calculated by RPC function
    NULL as address1,          -- We don't have this data in orders table
    NULL as address2,
    NULL as city,
    NULL as province,
    NULL as country,
    NULL as zip,
    NOW() as created_at,
    NOW() as updated_at
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id AND o.store_id = c.store_id
WHERE c.customer_id IS NULL
  AND o.store_id = 'buycosari'
ON CONFLICT (customer_id) DO NOTHING;

-- Show how many customers were added
SELECT COUNT(*) as customers_added FROM customers WHERE created_at >= NOW() - INTERVAL '1 minute';

-- Show total customers count
SELECT COUNT(*) as total_customers FROM customers WHERE store_id = 'buycosari';

-- Show customers with multiple orders
SELECT 
    c.customer_id,
    c.email,
    COUNT(o.id) as actual_orders_count
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id AND c.store_id = o.store_id
WHERE c.store_id = 'buycosari'
GROUP BY c.customer_id, c.email
HAVING COUNT(o.id) > 1
ORDER BY COUNT(o.id) DESC;
