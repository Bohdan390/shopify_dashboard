const { supabase } = require('../config/database-supabase');

class ProductGroupingService {
	constructor() {
		this.supabase = supabase;
	}

	extractProductSku(productTitle) {
		if (!productTitle) return null;
        const sku = productTitle.replace(/\d+x\s/gi, '');
        return sku;
	}

	async autoGroupProducts(storeId="meonutrition") {
        storeId = "meonutrition"
        const { data: products, error } = await supabase
            .from('products')
            .select('product_title, product_id')
            .eq('store_id', storeId);

        const { data: productRevenue, error: productRevenueError } = await supabase
            .rpc('aggregate_product_revenue', {
                p_store_id: storeId,
                p_start_date: '2025-07-01',
                p_end_date: '2025-08-31'
        });

        var doNotGroup = [];
        products.forEach(product => {
            const sku = this.extractProductSku(product.product_title);
            var group = doNotGroup.find(p => p.sku === sku);
            var row = productRevenue.find(p => p.product_title === product.product_title);
            if (row != undefined) {
                if (group) {
                    group.revenue += row?.total_revenue || 0;
                    group.order_count += row.order_count
                }
                else {
                    doNotGroup.push({sku: sku, order_count: row.order_count,  revenue: row?.total_revenue || 0});
                }
            }
           
        });

        if (error) {
            console.error('❌ Error fetching product groups:', error);
        }
        return doNotGroup;
	}

    async getCustomerLTV() {
        const { data: customers, error } = await supabase
            .from('customers')
            .select('customer_id, customer_name, customer_email, customer_phone, customer_address, customer_city, customer_state, customer_zip, customer_country, customer_created_at, customer_updated_at')
            .eq('store_id', storeId);

        if (error) {
            console.error('❌ Error fetching customers:', error);
        }
        return customers;
    }
	// Get product group analytics summary
	async getProductGroupAnalytics(storeId, startDate, endDate) {
		
	}
}

module.exports = ProductGroupingService;
