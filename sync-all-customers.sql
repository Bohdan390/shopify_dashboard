-- Sync ALL missing customers from orders table for both stores
-- This will create customer records for all customers that exist in orders but not in customers table

-- Sync for buycosari store
INSERT INTO customers (
    customer_id, store_id, email, first_name, last_name, phone,
    orders_count, total_spent, address1, address2, city, province,
    country, zip, created_at, updated_at
)
SELECT DISTINCT
    o.customer_id, o.store_id, o.customer_email as email,
    'Unknown' as first_name, 'Customer' as last_name, NULL as phone,
    0 as orders_count, 0 as total_spent, NULL as address1, NULL as address2,
    NULL as city, NULL as province, NULL as country, NULL as zip,
    NOW() as created_at, NOW() as updated_at
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id AND o.store_id = c.store_id
WHERE c.customer_id IS NULL AND o.store_id = 'buycosari'
ON CONFLICT (customer_id) DO NOTHING;

-- Sync for meonutrition store
INSERT INTO customers (
    customer_id, store_id, email, first_name, last_name, phone,
    orders_count, total_spent, address1, address2, city, province,
    country, zip, created_at, updated_at
)
SELECT DISTINCT
    o.customer_id, o.store_id, o.customer_email as email,
    'Unknown' as first_name, 'Customer' as last_name, NULL as phone,
    0 as orders_count, 0 as total_spent, NULL as address1, NULL as address2,
    NULL as city, NULL as province, NULL as country, NULL as zip,
    NOW() as created_at, NOW() as updated_at
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id AND o.store_id = c.store_id
WHERE c.customer_id IS NULL AND o.store_id = 'meonutrition'
ON CONFLICT (customer_id) DO NOTHING;

-- Show results
SELECT 
    'buycosari' as store,
    COUNT(*) as total_customers,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 minute' THEN 1 END) as newly_added
FROM customers 
WHERE store_id = 'buycosari'

UNION ALL

SELECT 
    'meonutrition' as store,
    COUNT(*) as total_customers,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 minute' THEN 1 END) as newly_added
FROM customers 
WHERE store_id = 'meonutrition';

-- Show customers with multiple orders (after sync)
SELECT 
    c.store_id,
    c.customer_id,
    c.email,
    COUNT(o.id) as actual_orders_count,
    SUM(o.total_price) as total_spent
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id AND c.store_id = o.store_id
WHERE c.store_id IN ('buycosari', 'meonutrition')
GROUP BY c.store_id, c.customer_id, c.email
HAVING COUNT(o.id) > 1
ORDER BY c.store_id, COUNT(o.id) DESC
LIMIT 20;
