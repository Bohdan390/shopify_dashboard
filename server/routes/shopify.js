const express = require('express');
const router = express.Router();
const ShopifyService = require('../services/shopifyService');
const { supabase } = require('../config/database-supabase');
const common = require("../config/common");

// Sync orders from Shopify
router.post('/sync-orders', async (req, res) => {
  try {
    const { limit = 50, syncDate, storeId = 'buycosari', from } = req.body;
    
    // Enhanced socket debugging
    console.log('🔍 SYNC ORDERS REQUEST DEBUG:');
    console.log('📋 Request body:', req.body);
    console.log('🔌 Socket ID from request:', req.body.socketId);
    
    // Get socket info
    const socketInfo = common.getActiveSocketsInfo();
    console.log('🔌 Active sockets info:', socketInfo);
    
    // Get the socket instance from the request
    const socket = req.body.socketId ? common.getSocket(req.body.socketId) : null;
    
    if (socket) {
      console.log(`✅ Found socket ${req.body.socketId} for sync`);
    } else {
      console.warn(`⚠️ Socket ${req.body.socketId} not found in activeSockets`);
      console.log('🔍 This might indicate:');
      console.log('   - Server restarted and lost socket connections');
      console.log('   - Socket disconnected before sync started');
      console.log('   - Multiple server instances running');
      console.log('   - Socket ID mismatch between client and server');
      
      // Try to find any socket for this store as a fallback
      let fallbackSocket = null;
      common.activeSockets.forEach((ws, id) => {
        if (ws.storeId === storeId && ws.readyState === 1) {
          fallbackSocket = ws;
          console.log(`🔄 Using fallback socket ${id} for store ${storeId}`);
        }
      });
      
      if (fallbackSocket) {
        console.log(`✅ Found fallback socket for store ${storeId}`);
        socket = fallbackSocket;
      } else {
        console.warn(`❌ No fallback socket found for store ${storeId}`);
      }
    }
    
    // Create store-specific service instance
    const storeService = new ShopifyService(storeId);
    
    res.json({ 
      message: 'Orders synced and revenue recalculated successfully'
    });

    var socketStatus = from == "dashboard" ? "dashboard_syncProgress" : "global_syncProgress";

    // Step 1: Sync orders from Shopify with real-time progress
    await storeService.syncOrders(parseInt(limit), syncDate, socket, socketStatus);
    
    // Step 2: Recalculate ONLY revenue/orders (no ads, no COGS) - much faster!
  } catch (error) {
    console.error('❌ Error syncing orders:', error);
    
    // Enhanced error handling with socket debugging
    const socket = req.body.socketId ? common.getSocket(req.body.socketId) : null;
    if (socket) {
      const message = JSON.stringify({
        type: socketStatus,
        data: {
          stage: 'error',
          message: `❌ Error syncing orders: ${error.message}`,
          progress: 0,
          total: 0,
          error: error.message
        },
        timestamp: Date.now()
      });
      socket.send(message);
    } else {
      console.warn('⚠️ Cannot send error to client - socket not found');
    }
    
    res.status(500).json({ error: 'Failed to sync orders' });
  }
});

// Get revenue data for a date range
router.get('/revenue', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const storeService = new ShopifyService('buycosari'); // Default store for revenue data
    const revenueData = await storeService.getRevenueData(startDate, endDate);
    res.json(revenueData);
  } catch (error) {
    console.error('Error getting revenue data:', error);
    res.status(500).json({ error: 'Failed to get revenue data' });
  }
});

// Get products for a store
router.get('/products/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { search = '', limit = 1000 } = req.query;
    
    let query = supabase
      .from('products')
      .select('product_id, product_title, vendor, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    
    // Add search filter if provided
    if (search && search.trim()) {
      query = query.or(`product_title.ilike.%${search}%`);
    }
    
    // Apply limit
    query = query.limit(parseInt(limit));
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || [],
      count: data ? data.length : 0
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

// Get recent orders with pagination, search, and sorting
router.get('/orders', async (req, res) => {
  try {
    const { limit = 100, offset = 0, page = 1, search = '', status = '', fulfillmentStatus = '', unfulfilledOlderThan = '', sortBy = 'created_at', sortDirection = 'desc', storeId = 'buycosari', startDate, endDate } = req.query;
    
    // Debug logging
    console.log('🔍 Orders API Request:', {
      limit, offset, page, search, status, fulfillmentStatus, 
      unfulfilledOlderThan, sortBy, sortDirection, storeId, startDate, endDate
    });
    const pageSize = parseInt(limit);
    const pageOffset = parseInt(offset) || (parseInt(page) - 1) * pageSize;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required',
        received: { startDate, endDate }
      });
    }
    
    // Validate sort parameters
    const allowedSortFields = ['order_number', 'customer_email', 'total_price', 'financial_status', 'fulfillment_status', 'created_at'];
    const allowedSortDirections = ['asc', 'desc'];
    
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortDirection = allowedSortDirections.includes(sortDirection) ? sortDirection : 'desc';
    
    // Build query with search and status filters
    let query = supabase
      .from('orders')
      .select('order_number, total_price, financial_status, fulfillment_status, created_at, customer_email, shopify_order_id, refund_price, total_tax, total_discounts')
      .eq('store_id', storeId)
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59.999');
    
    // Add search filter if provided
    if (search && search.trim()) {
      query = query.or(`order_number.ilike.%${search}%,customer_email.ilike.%${search}%`);
    }
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query = query.eq('financial_status', status);
    }

    // Add fulfillment status filter if provided
    if (fulfillmentStatus && fulfillmentStatus !== 'all') {
      query = query.eq('fulfillment_status', fulfillmentStatus);
    }

         // Add unfulfilled filter for orders older than specified time
     if (unfulfilledOlderThan) {
       const now = new Date();
       const hoursAgo = new Date(now.getTime() - parseInt(unfulfilledOlderThan) * 60 * 60 * 1000);
       console.log(`🔍 Unfulfilled filter: ${unfulfilledOlderThan} hours ago = ${hoursAgo.toISOString()}`);
       query = query
         .eq('fulfillment_status', 'unfulfilled')
         .lt('created_at', hoursAgo.toISOString());
     }
    
    // Get total count for pagination (with filters)
    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59.999');
    
    if (search && search.trim()) {
      countQuery = countQuery.or(`order_number.ilike.%${search}%,customer_email.ilike.%${search}%`);
    }
    
    if (status && status !== 'all') {
      countQuery = countQuery.eq('financial_status', status);
    }

    if (fulfillmentStatus && fulfillmentStatus !== 'all') {
      countQuery = countQuery.eq('fulfillment_status', fulfillmentStatus);
    }

    if (unfulfilledOlderThan) {
      const now = new Date();
      const hoursAgo = new Date(now.getTime() - parseInt(unfulfilledOlderThan) * 60 * 60 * 1000);
      console.log(`🔍 Count query unfulfilled filter: ${unfulfilledOlderThan} hours ago = ${hoursAgo.toISOString()}`);
      countQuery = countQuery
        .eq('fulfillment_status', 'unfulfilled')
        .lt('created_at', hoursAgo.toISOString());
    }
    
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;
    // Get orders with pagination, filters, and sorting
    const { data, error } = await query
      .order(validSortBy, { ascending: validSortDirection === 'asc' })
      .range(pageOffset, pageOffset + pageSize - 1);
    
    if (error) throw error;
    
    const totalPages = Math.ceil(count / pageSize);
    const currentPage = Math.floor(pageOffset / pageSize) + 1;
    
    res.json({
      orders: data,
      pagination: {
        currentPage,
        totalPages,
        totalOrders: count,
        pageSize,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      },
      sorting: {
        sortBy: validSortBy,
        sortDirection: validSortDirection
      }
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

router.get('/order-line-items', async (req, res) => {
  const {order_id} = req.query
  const {data, error} = await supabase.from("order_line_items").select("*").eq("shopify_order_id", order_id)
  var skus = data.map(item => item.sku.includes("-") ? item.sku.split("-")[0] + "-" + item.sku.split("-")[1] : item.sku)
  var {data: productSkus, error: productSkusError} = await supabase.from("product_skus").select("sku_id, sku_title").in("sku_id", skus) 
  if (productSkusError) {
    console.error('Error getting product skus:', productSkusError);
    res.status(500).json({ error: 'Failed to get product skus' });
  }
  data.forEach(item => {
    item.sku_title = productSkus.find(product => item.sku.includes(product.sku_id))?.sku_title
  })
  if (error) {
    console.error('Error getting order line items:', error);
    res.status(500).json({ error: 'Failed to get order line items' });
  }
  res.json(data);
})

// Get order statistics
router.get('/stats', async (req, res) => {
  try {
    const { storeId = 'buycosari', startDate, endDate } = req.query;
    // Get total count first (same as orders endpoint)

    const stats = await supabase.rpc('get_orders_price_stats', {
      p_store_id: storeId,
      p_start_date: startDate + 'T00:00:00',
      p_end_date: endDate + 'T23:59:59.999'
    });
    var data = {
      totalOrders: stats.data[0].total_orders_count,
      paidOrders: stats.data[0].paid_orders_count,
      totalRevenue: stats.data[0].total_orders_price,
      paidRevenue: stats.data[0].paid_orders_price,
      avgOrderValue: stats.data[0].total_orders_price / stats.data[0].total_orders_count,
    }
    res.json(data);
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({ error: 'Failed to get order statistics' });
  }
});

module.exports = router; 