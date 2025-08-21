const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database-supabase');
const windsorService = require('../services/windsorService');
const common = require('../config/common');
const socketManager = require('../services/socketManager');

// Sync ad data from Windsor.ai
router.post('/sync-windsor', async (req, res) => {
  try {
    let { startDate, endDate, storeId, accountName, from } = req.body;
    
    if (!startDate) startDate = common.createLocalDateWithTime("2020-01-01").toISOString();
    if (!endDate) endDate = common.createLocalDateWithTime(new Date()).toISOString();

    startDate = startDate.split('T')[0];
    endDate = endDate.split('T')[0];

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    if (!storeId && !accountName) {
      return res.status(400).json({ error: 'Either storeId or accountName is required' });
    }

    const filterText = accountName ? `account: ${accountName}` : `store: ${storeId}`;

    // Get the socket instance from the request
    const socket = req.body.socketId ? socketManager.activeSockets.get(req.body.socketId) : null;

    var socketStatus = from == "global" ? "global_adsSyncProgress" : "adsSyncProgress";

    res.json({ message: `Windsor.ai sync and analytics recalculation completed successfully for ${filterText}` });
    
    await windsorService.fetchAndSaveAdData(startDate, endDate, socket, storeId, socketStatus);
    
    // After syncing ads, recalculate analytics based on ads data
    if (socket) {
      const message = JSON.stringify({
        type: socketStatus,
        data: {
          stage: 'analytics_starting',
          message: '🔄 Starting analytics recalculation...',
          progress: 90,
          total: 'unlimited'
        },
        timestamp: Date.now()
      });
      socket.send(message);
    }
        
    if (socket) {
      const message = JSON.stringify({
        type: socketStatus,
        data: {
          stage: 'completed',
          message: '✅ Windsor.ai sync and analytics recalculation completed!',
          progress: 100,
          total: 'unlimited'
        },
        timestamp: Date.now()
      });
      socket.send(message);
    }

  } catch (error) {
    console.error('❌ Error syncing Windsor.ai data:', error);
    res.status(500).json({ error: 'Failed to sync Windsor.ai data' });
  }
});
// Get detailed ad spend data with pagination
router.get('/spend-detailed', async (req, res) => {
  try {
    const { startDate, endDate, platform, store_id, product_id, page = 1, pageSize = 20, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    let query = supabase
      .from('ad_spend_detailed')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' });

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (store_id) {
      query = query.eq('store_id', store_id);
    }

    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    // Apply pagination
    query = query.range(offset, offset + parseInt(pageSize) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching ad spend data:', error);
      throw error;
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
    console.error('❌ Error getting ad spend data:', error);
    res.status(500).json({ error: 'Failed to get ad spend data' });
  }
});

// Get campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { platform, store_id, product_id } = req.query;
    
    let query = supabase
      .from('ad_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (store_id) {
      query = query.eq('store_id', store_id);
    }

    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching campaigns:', error);
      throw error;
    }

    res.json({ data: data || [] });

  } catch (error) {
    console.error('❌ Error getting campaigns:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Get summary stats (aggregated data without pagination)
router.get('/summary-stats', async (req, res) => {
  try {
    const { startDate, endDate, platform, store_id, product_id } = req.query;
    
    // Get revenue data from orders using the RPC function
    let revenueData = { totalRevenue: 0 };
    if (startDate && endDate && store_id) {
      try {
        const { data: revenueStats, error: revenueError } = await supabase.rpc('get_orders_price_stats', {
          p_store_id: store_id,
          p_start_date: startDate + 'T00:00:00',
          p_end_date: endDate + 'T23:59:59.999'
        });

        if (revenueError) {
          console.error('❌ Error fetching revenue stats:', revenueError);
        } else if (revenueStats && revenueStats.length > 0) {
          revenueData.totalRevenue = revenueStats[0].total_orders_price || 0;
        }
      } catch (revenueErr) {
        console.error('❌ Error in revenue calculation:', revenueErr);
      }
    }

    // First, get the count to see how much data we have
    let countQuery = supabase
      .from('ad_spend_detailed')
      .select('*', { count: 'exact', head: true });

    if (startDate && endDate) {
      countQuery = countQuery.gte('date', startDate).lte('date', endDate);
    }

    // if (platform) {
    //   countQuery = countQuery.eq('platform', platform);
    // }

    if (store_id) {
      countQuery = countQuery.eq('store_id', store_id);
    }

    if (product_id) {
      countQuery = countQuery.eq('product_id', product_id);
    }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('❌ Error counting summary stats:', countError);
      throw countError;
    }

    // Fetch all data in chunks of 1000 (Supabase limit)
    let allData = [];
    const chunkSize = 1000;
    const totalChunks = Math.ceil((count || 0) / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize;
      
      let query = supabase
        .from('ad_spend_detailed')
        .select('spend_amount, platform, impressions, clicks, conversions, date')
        .range(offset, offset + chunkSize - 1);

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      // if (platform) {
      //   query = query.eq('platform', platform);
      // }

      if (store_id) {
        query = query.eq('store_id', store_id);
      }

      if (product_id) {
        query = query.eq('product_id', product_id);
      }

      const { data: chunkData, error } = await query;

      if (error) {
        console.error('❌ Error fetching summary stats chunk:', error);
        throw error;
      }

      allData = allData.concat(chunkData || []);
    }

    // Return both ad spend data and revenue data
    res.json({ 
      data: allData,
      revenue: revenueData.totalRevenue
    });

  } catch (error) {
    console.error('❌ Error getting summary stats:', error);
    res.status(500).json({ error: 'Failed to get summary stats' });
  }
});

// Get chart data (server-side processed)
router.get('/chart-data', async (req, res) => {
  try {
    const { startDate, endDate, platform, store_id, product_id } = req.query;
    
    let countQuery = supabase
      .from('ad_spend_detailed')
      .select('*', { count: 'exact', head: true });

    if (startDate && endDate) {
      countQuery = countQuery.gte('date', startDate).lte('date', endDate);
    }

    if (platform) {
      countQuery = countQuery.eq('platform', platform);
    }

    if (store_id) {
      countQuery = countQuery.eq('store_id', store_id);
    }

    if (product_id) {
      countQuery = countQuery.eq('product_id', product_id);
    }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('❌ Error counting chart data:', countError);
      throw countError;
    }

    // Fetch all data in chunks of 1000 (Supabase limit)
    let allData = [];
    const chunkSize = 1000;
    const totalChunks = Math.ceil((count || 0) / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize;
      
      let query = supabase
        .from('ad_spend_detailed')
        .select('date, platform, spend_amount')
        .range(offset, offset + chunkSize - 1);

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      if (platform) {
        query = query.eq('platform', platform);
      }

      if (store_id) {
        query = query.eq('store_id', store_id);
      }

      if (product_id) {
        query = query.eq('product_id', product_id);
      }

      const { data: chunkData, error } = await query;

      if (error) {
        console.error('❌ Error fetching chart data chunk:', error);
        throw error;
      }

      allData = allData.concat(chunkData || []);
    }

    // Process the data into chart format on server side
    const chartData = {};
    
    allData?.forEach(item => {
      const date = item.date;
      if (!chartData[date]) {
        chartData[date] = { date, facebook: 0, google: 0 };
      }
      
      if (item.platform === 'facebook') {
        chartData[date].facebook += parseFloat(item.spend_amount) || 0;
      } else if (item.platform === 'google') {
        chartData[date].google += parseFloat(item.spend_amount) || 0;
      }
    });

    const processedData = Object.values(chartData).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({ data: processedData });

  } catch (error) {
    console.error('❌ Error getting chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

// Add store
router.post('/stores', async (req, res) => {
  try {
    const { store_id, store_name, platform = 'shopify' } = req.body;
    
    if (!store_id || !store_name) {
      return res.status(400).json({ error: 'Store ID and name are required' });
    }

    const { data, error } = await supabase
      .from('stores')
      .upsert({
        store_id,
        store_name,
        platform,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'store_id' });

    if (error) {
      console.error('❌ Error adding store:', error);
      throw error;
    }

    res.json({ message: 'Store added successfully', data });

  } catch (error) {
    console.error('❌ Error adding store:', error);
    res.status(500).json({ error: 'Failed to add store' });
  }
});

// Get products
router.get('/products', async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = supabase
      .from('products')
      .select('*');

    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    query = query.order('product_title', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching products:', error);
      throw error;
    }

    res.json({ data: data || [] });

  } catch (error) {
    console.error('❌ Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Add product
router.post('/products', async (req, res) => {
  try {
    const { product_id, product_name, cost_price = 0 } = req.body;
    
    if (!product_id || !product_name) {
      return res.status(400).json({ error: 'Product ID and name are required' });
    }

    const { data, error } = await supabase
      .from('products')
      .upsert({
        product_id,
        product_name,
        cost_price: parseFloat(cost_price),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'product_id' });

    if (error) {
      console.error('❌ Error adding product:', error);
      throw error;
    }

    res.json({ message: 'Product added successfully', data });

  } catch (error) {
    console.error('❌ Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Get analytics with ad spend breakdown
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, store_id, product_id } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get analytics data
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (analyticsError) throw analyticsError;

    // Get ad spend data
    const { data: adSpendData, error: adSpendError } = await supabase
      .from('ad_spend_detailed')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (adSpendError) throw adSpendError;

    // Combine and process data
    const combinedData = analyticsData.map(analytics => {
      const daySpend = adSpendData.filter(spend => spend.date === analytics.date);
      
      const facebookSpend = daySpend
        .filter(spend => spend.platform === 'facebook')
        .reduce((sum, spend) => sum + parseFloat(spend.spend_amount || 0), 0);
      
      const googleSpend = daySpend
        .filter(spend => spend.platform === 'google')
        .reduce((sum, spend) => sum + parseFloat(spend.spend_amount || 0), 0);

      return {
        ...analytics,
        facebook_ads_spend: facebookSpend,
        google_ads_spend: googleSpend
      };
    });

    res.json({ data: combinedData });

  } catch (error) {
    console.error('❌ Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ===== COST OF GOODS (COG) ENDPOINTS =====

// Get cost of goods data with server-side pagination
router.get('/cog', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      store_id, 
      product_id, 
      page = 1, 
      pageSize = 25, 
      sortBy = 'date', 
      sortOrder = 'desc' 
    } = req.query;
    
    // buycosari 2023-10-30
    // meonutrition 2025-05-19
    // dermao 2024-05-01
    // nomobark 2024-05-14
    // gamoseries 2025-06-26
    // cosara 2025-05-27

    const {data:products} = await supabase.from("products").select("product_id").neq('store_id', "meonutrition");
    var ids = products.map(item => item.product_id);
    await supabase.from("products").update({product_sku_id: ids}).in("product_id", ids);

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    // Build the main query with pagination
    let query = supabase
      .from('cost_of_goods')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + parseInt(pageSize) - 1);

    // Add date range filter if provided
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    // Add store filter if provided
    if (store_id) {
      query = query.eq('store_id', store_id);
    }

    // Add product filter if provided
    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching cost of goods:', error);
      throw error;
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / parseInt(pageSize));
    const currentPage = parseInt(page);
    const hasNext = currentPage < totalPages;
    const hasPrev = currentPage > 1;

    res.json({
      data: data || [],
      pagination: {
        currentPage,
        totalPages,
        totalEntries: count || 0,
        pageSize: parseInt(pageSize),
        hasNext,
        hasPrev
      }
    });

  } catch (error) {
    console.error('❌ Error getting cost of goods:', error);
    res.status(500).json({ error: 'Failed to get cost of goods data' });
  }
});

// Add new cost of goods entry
router.post('/cog', async (req, res) => {
  try {
    const { 
      product_id, 
      product_title, 
      cost_per_unit, 
      quantity, 
      total_cost, 
      date,
      store_id = 'buycosari' // Default store ID
    } = req.body;

    // Validate required fields
    if (!product_id || !product_title || !cost_per_unit || !quantity || !total_cost || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields: product_id, product_title, cost_per_unit, quantity, total_cost, date' 
      });
    }

    // Calculate total cost if not provided
    let calculatedTotalCost = total_cost || (parseFloat(cost_per_unit) * parseInt(quantity));

    const {data: existingProduct} = await supabase.from("products").select("product_sku_id").eq('product_id', product_id).limit(1);
    var productSkuId = "";
    if (existingProduct.length > 0) {
      productSkuId = existingProduct[0].product_sku_id;
    }

    const { data, error } = await supabase
      .from('cost_of_goods')
      .insert({
        product_id,
        product_title,
        cost_per_unit: parseFloat(cost_per_unit),
        quantity: parseInt(quantity),
        total_cost: parseFloat(calculatedTotalCost),
        date,
        store_id,
        product_sku_id: productSkuId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

      if (productSkuId) {
        productSkuId = productSkuId.includes("-") ? productSkuId.split("-")[0] + "-" + productSkuId.split("-")[1] : productSkuId;
        await supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")}).eq('store_id', store_id).eq('product_sku', productSkuId);
      }

      const {data:analytic} = await supabase.from("analytics").select("cost_of_goods").eq('date', date).eq('store_id', store_id).limit(1);
      if (analytic.length > 0) {
        calculatedTotalCost = parseFloat(calculatedTotalCost) + parseFloat(analytic[0].cost_of_goods);
      }
      await supabase.from("analytics").upsert({
        date,
        store_id,
        cost_of_goods: parseFloat(calculatedTotalCost)
      }, { 
        onConflict: 'date,store_id',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error('❌ Error adding cost of goods entry:', error);
      throw error;
    }

    res.json({ message: 'Cost of goods entry added successfully', data });

  } catch (error) {
    console.error('❌ Error adding cost of goods entry:', error);
    res.status(500).json({ error: 'Failed to add cost of goods entry' });
  }
});

// Update cost of goods entry
router.put('/cog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      product_id, 
      product_title, 
      cost_per_unit, 
      quantity, 
      total_cost, 
      date,
      store_id 
    } = req.body;

    // Validate required fields
    if (!product_id || !product_title || !cost_per_unit || !quantity || !total_cost || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields: product_id, product_title, cost_per_unit, quantity, total_cost, date' 
      });
    }

    // Calculate total cost if not provided
    let calculatedTotalCost = total_cost || (parseFloat(cost_per_unit) * parseInt(quantity));

    const {data: updated} = await supabase
      .from("cost_of_goods")
      .select("total_cost")
      .eq("id", id)
      .limit(1);

    let originTotalCost = 0;
    if (updated.length > 0) {
      originTotalCost = updated[0].total_cost;
    }
    const { data, error } = await supabase
      .from('cost_of_goods')
      .update({
        product_id,
        product_title,
        cost_per_unit: parseFloat(cost_per_unit),
        quantity: parseInt(quantity),
        total_cost: parseFloat(calculatedTotalCost),
        date,
        store_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    const {data:analytic} = await supabase.from("analytics").select("cost_of_goods").eq('date', date).eq('store_id', store_id).limit(1);
    if (analytic.length > 0) {
      calculatedTotalCost = (calculatedTotalCost - originTotalCost) + parseFloat(analytic[0].cost_of_goods);
    }
    await supabase.from("analytics").upsert({
      date,
      store_id,
      cost_of_goods: parseFloat(calculatedTotalCost)
    }, { 
      onConflict: 'date,store_id',
      ignoreDuplicates: false 
    })
    if (error) {
      console.error('❌ Error updating cost of goods entry:', error);
      throw error;
    }

    res.json({ message: 'Cost of goods entry updated successfully', data });

  } catch (error) {
    console.error('❌ Error updating cost of goods entry:', error);
    res.status(500).json({ error: 'Failed to update cost of goods entry' });
  }
});

// Delete cost of goods entry
router.delete('/cog/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let calculatedTotalCost = 0;
    const {data:costOfGoods} = await supabase.from("cost_of_goods").select("total_cost, date, store_id").eq("id", id).limit(1);
    if (costOfGoods.length > 0) {
      calculatedTotalCost = costOfGoods[0].total_cost;
    }
    const { error } = await supabase
      .from('cost_of_goods')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting cost of goods entry:', error);
      throw error;
    }
    const {data:analytic} = await supabase.from("analytics").select("cost_of_goods").eq('date', costOfGoods[0].date).eq('store_id', costOfGoods[0].store_id).limit(1);
    if (analytic.length > 0) {
      calculatedTotalCost = parseFloat(analytic[0].cost_of_goods) - calculatedTotalCost;
      if (calculatedTotalCost < 0) calculatedTotalCost = 0;
      await supabase.from("analytics").upsert({
        date: costOfGoods[0].date,
        store_id: costOfGoods[0].store_id,
        cost_of_goods: parseFloat(calculatedTotalCost)
      }, { 
        onConflict: 'date,store_id',
        ignoreDuplicates: false 
      })
    }
    res.json({ message: 'Cost of goods entry deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting cost of goods entry:', error);
    res.status(500).json({ error: 'Failed to delete cost of goods entry' });
  }
});

// Get cost of goods summary statistics
router.get('/cog/summary', async (req, res) => {
  try {
    const { startDate, endDate, store_id } = req.query;
    
    let query = supabase
      .from('cost_of_goods')
      .select('total_cost, quantity, date');

    // Add date range filter if provided
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    // Add store filter if provided
    if (store_id) {
      query = query.eq('store_id', store_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching cost of goods summary:', error);
      throw error;
    }

    // Calculate summary statistics
    const summary = {
      totalCost: data.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0),
      totalQuantity: data.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0),
      entryCount: data.length,
      averageCostPerUnit: data.length > 0 
        ? data.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0) / data.length 
        : 0
    };

    res.json(summary);

  } catch (error) {
    console.error('❌ Error getting cost of goods summary:', error);
    res.status(500).json({ error: 'Failed to get cost of goods summary' });
  }
});

module.exports = router; 