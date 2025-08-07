const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database-supabase');
const windsorService = require('../services/windsorService');
const analyticsService = require('../services/analyticsService');

// Sync ad data from Windsor.ai
router.post('/sync-windsor', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    console.log('🔄 Starting Windsor.ai sync...');

    // Get the socket instance from the request
    const io = req.app.get('io');
    const socket = req.body.socketId ? io.sockets.sockets.get(req.body.socketId) : null;

    // Use the new fetchAndSaveAdData method with socket for progress updates
    const result = await windsorService.fetchAndSaveAdData(startDate, endDate, socket);
    
    // After syncing ads, recalculate analytics based on ads data
    if (socket) {
      socket.emit('adsSyncProgress', {
        stage: 'analytics_starting',
        message: '🔄 Starting analytics recalculation...',
        progress: 90,
        total: 'unlimited'
      });
    }
    
    console.log('🔄 Recalculating ads-only analytics after Windsor.ai sync...');
    await analyticsService.recalculateAdsOnlyAnalytics(socket, 'adsSyncProgress', startDate, endDate);
    
    if (socket) {
      socket.emit('adsSyncProgress', {
        stage: 'completed',
        message: '✅ Windsor.ai sync and analytics recalculation completed!',
        progress: 100,
        total: 'unlimited'
      });
    }
    
    res.json({
      message: 'Windsor.ai sync and analytics recalculation completed successfully',
      campaignsSaved: result.campaignsSaved,
      adSpendRecordsSaved: result.adSpendRecordsSaved,
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('❌ Error syncing Windsor.ai data:', error);
    res.status(500).json({ error: 'Failed to sync Windsor.ai data' });
  }
});

// Sync Google Ads data
router.post('/sync-google', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    console.log('🔄 Starting Google Ads sync...');

    // Get the socket instance from the request
    const io = req.app.get('io');
    const socket = req.body.socketId ? io.sockets.sockets.get(req.body.socketId) : null;

    const googleAdsService = require('../services/googleAdsService');
    await googleAdsService.syncGoogleAds(startDate, endDate, socket);
    
    // After syncing ads, recalculate analytics based on ads data
    if (socket) {
      socket.emit('adsSyncProgress', {
        stage: 'analytics_starting',
        message: '🔄 Starting analytics recalculation...',
        progress: 90,
        total: 'unlimited'
      });
    }
    
    console.log('🔄 Recalculating ads-only analytics after Google Ads sync...');
    await analyticsService.recalculateAdsOnlyAnalytics(socket, 'adsSyncProgress', startDate, endDate);
    
    if (socket) {
      socket.emit('adsSyncProgress', {
        stage: 'completed',
        message: '✅ Google Ads sync and analytics recalculation completed!',
        progress: 100,
        total: 'unlimited'
      });
    }
    
    res.json({
      message: 'Google Ads sync and analytics recalculation completed successfully',
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('❌ Error syncing Google Ads data:', error);
    res.status(500).json({ error: 'Failed to sync Google Ads data' });
  }
});

// Sync Facebook Ads data
router.post('/sync-facebook', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    console.log('🔄 Starting Facebook Ads sync...');

    // Get the socket instance from the request
    const io = req.app.get('io');
    const socket = req.body.socketId ? io.sockets.sockets.get(req.body.socketId) : null;

    const facebookAdsService = require('../services/facebookAdsService');
    await facebookAdsService.syncFacebookAds(startDate, endDate, socket);
    
    // After syncing ads, recalculate analytics based on ads data
    if (socket) {
      socket.emit('adsSyncProgress', {
        stage: 'analytics_starting',
        message: '🔄 Starting analytics recalculation...',
        progress: 90,
        total: 'unlimited'
      });
    }
    
    console.log('🔄 Recalculating ads-only analytics after Facebook Ads sync...');
    await analyticsService.recalculateAdsOnlyAnalytics(socket, 'adsSyncProgress', startDate, endDate);
    
    if (socket) {
      socket.emit('adsSyncProgress', {
        stage: 'completed',
        message: '✅ Facebook Ads sync and analytics recalculation completed!',
        progress: 100,
        total: 'unlimited'
      });
    }
    
    res.json({
      message: 'Facebook Ads sync and analytics recalculation completed successfully',
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('❌ Error syncing Facebook Ads data:', error);
    res.status(500).json({ error: 'Failed to sync Facebook Ads data' });
  }
});

// Get detailed ad spend data with pagination
router.get('/spend-detailed', async (req, res) => {
  try {
    const { startDate, endDate, platform, store_id, product_id, page = 1, pageSize = 20, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    // Calculate offset for pagination
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

    // if (store_id) {
    //   countQuery = countQuery.eq('store_id', store_id);
    // }

    // if (product_id) {
    //   countQuery = countQuery.eq('product_id', product_id);
    // }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('❌ Error counting summary stats:', countError);
      throw countError;
    }

    console.log(`📊 Total records available: ${count || 0}`);

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

      // if (store_id) {
      //   query = query.eq('store_id', store_id);
      // }

      // if (product_id) {
      //   query = query.eq('product_id', product_id);
      // }

      const { data: chunkData, error } = await query;

      if (error) {
        console.error('❌ Error fetching summary stats chunk:', error);
        throw error;
      }

      allData = allData.concat(chunkData || []);
      console.log(`📊 Fetched chunk ${i + 1}/${totalChunks}: ${chunkData?.length || 0} records`);
    }

    console.log(`📊 Summary stats fetched: ${allData.length} total records`);
    res.json({ data: allData });

  } catch (error) {
    console.error('❌ Error getting summary stats:', error);
    res.status(500).json({ error: 'Failed to get summary stats' });
  }
});

// Get chart data (server-side processed)
router.get('/chart-data', async (req, res) => {
  try {
    const { startDate, endDate, platform, store_id, product_id } = req.query;
    
    // First, get the count to see how much data we have
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

    console.log(`📊 Total chart records available: ${count || 0}`);

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
      console.log(`📊 Fetched chart chunk ${i + 1}/${totalChunks}: ${chunkData?.length || 0} records`);
    }

    console.log(`📊 Raw chart data fetched: ${allData.length} total records`);

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
    
    console.log(`📊 Chart data processed: ${processedData.length} unique dates`);
    console.log(`📊 Date range: ${processedData[0]?.date} to ${processedData[processedData.length - 1]?.date}`);

    res.json({ data: processedData });

  } catch (error) {
    console.error('❌ Error getting chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

// Get stores
router.get('/stores', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('store_name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching stores:', error);
      throw error;
    }

    res.json({ data: data || [] });

  } catch (error) {
    console.error('❌ Error getting stores:', error);
    res.status(500).json({ error: 'Failed to get stores' });
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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('product_title', { ascending: true });

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

module.exports = router; 