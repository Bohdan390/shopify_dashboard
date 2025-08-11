-- Migration: Add store_id column to order_line_items table
-- This fixes the "Could not find the 'store_id' column" error

-- Add store_id column to order_line_items table
ALTER TABLE order_line_items ADD COLUMN IF NOT EXISTS store_id VARCHAR(255);

-- Update existing records to have a default store_id (you may want to update this based on your data)
-- For now, we'll set a default value for existing records
UPDATE order_line_items SET store_id = 'buycosari' WHERE store_id IS NULL;

-- Make store_id NOT NULL after updating existing records
ALTER TABLE order_line_items ALTER COLUMN store_id SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_order_line_items_store_id ON order_line_items(store_id);
