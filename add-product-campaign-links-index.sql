-- Add index for product_campaign_links table
CREATE INDEX IF NOT EXISTS idx_product_campaign_links_product_id ON product_campaign_links(product_id);
CREATE INDEX IF NOT EXISTS idx_product_campaign_links_campaign_id ON product_campaign_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_product_campaign_links_active ON product_campaign_links(is_active);

-- Add RLS policy for product_campaign_links
CREATE POLICY "Allow all operations on product_campaign_links" ON product_campaign_links FOR ALL USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_product_campaign_links_updated_at BEFORE UPDATE ON product_campaign_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 