const express = require('express');
const router = express.Router();
const ShopifyService = require('../services/shopifyService');
const { supabase } = require('../config/database-supabase');
const socketManager = require('../services/socketManager');

// Sync orders from Shopify
router.post('/sync-orders', async (req, res) => {
  try {
    	const { limit = 50, syncDate, storeId = 'buycosari', from } = req.body;
    
    // Get the socket instance from the request
    const socket = req.body.socketId ? socketManager.activeSockets.get(req.body.socketId) : null;
    
    console.log(socket)
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
    
    // Emit error to client if WebSocket is available
    const socket = req.body.socketId ? socketManager.activeSockets.get(req.body.socketId) : null;
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

// Get recent orders with pagination, search, and sorting
router.get('/orders', async (req, res) => {
  try {
    const { limit = 100, offset = 0, page = 1, search = '', status = '', sortBy = 'created_at', sortDirection = 'desc', storeId = 'buycosari', startDate, endDate } = req.query;
    const pageSize = parseInt(limit);
    const pageOffset = parseInt(offset) || (parseInt(page) - 1) * pageSize;
    
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