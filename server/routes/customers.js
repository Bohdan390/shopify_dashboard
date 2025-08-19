const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database-supabase');
const common = require('../config/common');

// Get customers with analytics
router.get('/analytics', async (req, res) => {
  try {
    const { 
      storeId, 
      searchEmail, 
      page = 1, 
      pageSize = 20,
      sortField = 'total_orders_price',
      sortDirection = 'desc'
    } = req.query;

    // Call the RPC function
    const { data, error } = await supabase.rpc('get_customer_analytics', {
      p_store_id: storeId || null,
      p_search_email: searchEmail || null,
      p_limit: parseInt(pageSize),
      p_offset: (parseInt(page) - 1) * parseInt(pageSize),
      p_sort_field: sortField,
      p_sort_direction: sortDirection
    });

    if (error) {
      console.error('❌ Error fetching customer analytics:', error);
      throw error;
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId);

    if (countError) {
      console.error('❌ Error counting customers:', countError);
      throw countError;
    }

    const totalPages = Math.ceil((count || 0) / parseInt(pageSize));

    res.json({
      data: data || [],
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages,
        totalItems: count || 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting customer analytics:', error);
    res.status(500).json({ error: 'Failed to get customer analytics' });
  }
});

router.get('/products-sku', async (req, res) => {
	try {
		const { storeId = 'buycosari' } = req.query;
		const { data, error } = await supabase
			.from('products')
			.select('product_sku_id, product_title')
			.eq('store_id', storeId)
			.order('product_sku_id', { ascending: true });
		
		var productSkus = new Map();
    if (data) {
      data.forEach((item) => {
        var s = item.product_sku_id;
        if (s.includes("-")) {
          s = s.split("-")[0] + "-" + s.split("-")[1];
        }
        productSkus.set(s, {product_sku_title: common.extractProductSku(item.product_title), product_sku_id: s});
      })
    }
	  if (error) {
		console.error('❌ Error fetching products:', error);
		throw error;
	  }
  
	  res.json({ data: Array.from(productSkus.values()) || [] });
  
	} catch (error) {
	  console.error('❌ Error getting products:', error);
	  res.status(500).json({ error: 'Failed to get products' });
	}
});
// Get customer details with order history
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { storeId } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('get_customer_details', {
      p_customer_id: customerId,
      p_store_id: storeId || null
    });

    if (error) {
      console.error('❌ Error fetching customer details:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ data: data[0] });

  } catch (error) {
    console.error('❌ Error getting customer details:', error);
    res.status(500).json({ error: 'Failed to get customer details' });
  }
});

// Get customer summary stats
router.get('/summary/stats', async (req, res) => {
  try {
    const { storeId } = req.query;


    // const {data: orders, error: ordersError} = await supabase.from('orders').select('*')
    // .eq('store_id', storeId).gte('created_at', '2024-01-01' + 'T00:00:00').lte('created_at', '2025-08-08' + 'T23:59:59.999');
    // if (ordersError) {
    //   console.error('❌ Error fetching orders:', ordersError);
    //   throw ordersError;
    // }

    // var docs = {}
    // orders.forEach((order) => {
    //   if (docs[order.customer_id] == undefined) {
    //     docs[order.customer_id] = 1
    //   }
    //   else docs[order.customer_id] ++
    // })

    const startDateUTC = new Date(Date.UTC(2024, 0, 1, 0, 0 ,0))
    const endDateUTC = new Date(Date.UTC(2025, 7, 8, 23, 59, 59, 999)) // months are 0-based

    const { count: totalCustomers, error: customersError } = await supabase
      .from('customers')
      .select('customer_id', { count: 'exact', head: true })
      .eq('store_id', storeId);

    const stats = await supabase.rpc('get_orders_price_stats', {
      p_store_id: storeId,
      p_start_date: startDateUTC.toISOString(),
      p_end_date: endDateUTC.toISOString()
    });

    if (stats.error) {
      console.error('❌ Error fetching orders stats:', stats.error);
      throw stats.error;
    }

    var data = {
      totalOrders: stats.data[0].total_orders_count,
      paidOrders: stats.data[0].paid_orders_count,
      totalRevenue: stats.data[0].total_orders_price,
      paidRevenue: stats.data[0].paid_orders_price,
      avgOrderValue: stats.data[0].total_orders_price / stats.data[0].total_orders_count,
    }
    
    console.log(data.totalOrders, "totalOrders")
    res.json({
      data: {
        totalCustomers: totalCustomers || 0,
        totalRevenue: data.totalRevenue,
        averageRevenue: data.totalRevenue / totalCustomers,
        totalOrders: data.totalOrders,
      }
    });

  } catch (error) {
    console.error('❌ Error getting customer summary stats:', error);
    res.status(500).json({ error: 'Failed to get customer summary stats' });
  }
});

module.exports = router;
