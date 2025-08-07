const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { supabase } = require('../config/database-supabase');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 Health check requested');
    
    // Test Supabase connection
    const { data, error } = await supabase
      .from('analytics')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Health check failed:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message 
      });
    }

    console.log('✅ Health check passed');
    res.json({ 
      status: 'healthy', 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Health check failed',
      error: error.message 
    });
  }
});

// Get daily analytics for a date range
router.get('/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const analytics = await analyticsService.getAnalyticsRange(startDate, endDate);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching daily analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get summary statistics
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const summary = await analyticsService.getSummaryStats(startDate, endDate);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get store analytics
router.get('/store', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const storeAnalytics = await analyticsService.calculateStoreAnalytics(startDate, endDate);
    res.json(storeAnalytics);
  } catch (error) {
    console.error('Error fetching store analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product analytics
router.get('/product', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sortBy = 'total_revenue', 
      sortOrder = 'desc', 
      search = '',
      minRevenue = '',
      maxRevenue = '',
      minProfit = '',
      maxProfit = '',
      minROI = '',
      maxROI = '',
      page = 1,
      limit = 50
    } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Validate sort parameters
    const validSortFields = ['product_title', 'total_revenue', 'ad_spend', 'profit', 'roi_percentage', 'order_count'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({ error: 'Invalid sortBy parameter' });
    }
    
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({ error: 'Invalid sortOrder parameter' });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const productAnalytics = await analyticsService.calculateProductAnalytics(
      startDate, 
      endDate, 
      {
        sortBy,
        sortOrder,
        search,
        minRevenue: minRevenue ? parseFloat(minRevenue) : null,
        maxRevenue: maxRevenue ? parseFloat(maxRevenue) : null,
        minProfit: minProfit ? parseFloat(minProfit) : null,
        maxProfit: maxProfit ? parseFloat(maxProfit) : null,
        minROI: minROI ? parseFloat(minROI) : null,
        maxROI: maxROI ? parseFloat(maxROI) : null,
        page: pageNum,
        limit: limitNum
      }
    );
    
    res.json(productAnalytics);
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recalculate all analytics
router.post('/recalculate', async (req, res) => {
  try {
    const { recalcDate, socketId } = req.body;
    
    if (!recalcDate) {
      return res.status(400).json({ error: 'recalcDate is required' });
    }

    // Get the socket instance from the request
    const io = req.app.get('io');
    const socket = socketId ? io.sockets.sockets.get(socketId) : null;

    console.log('🔄 Recalculating analytics from date:', recalcDate);
    const result = await analyticsService.recalculateAnalyticsFromDate(recalcDate, socket, true);
    
    // Emit final completion
    if (socket) {
      socket.emit('recalcProgress', {
        stage: 'completed',
        message: '✅ Analytics recalculation completed successfully!',
        progress: 100,
        total: 'unlimited'
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error recalculating analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recalculate ads-only analytics
router.post('/recalculate-ads-only', async (req, res) => {
  try {
    const { startDate, endDate, socketId } = req.body;
    
    // Get the socket instance from the request
    const io = req.app.get('io');
    const socket = socketId ? io.sockets.sockets.get(socketId) : null;
    
    console.log('🔄 Recalculating ads-only analytics...');
    if (startDate && endDate) {
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
    }
    
    const result = await analyticsService.recalculateAdsOnlyAnalytics(socket, 'recalcProgress', startDate, endDate);
    
    // Emit final completion
    if (socket) {
      socket.emit('recalcProgress', {
        stage: 'completed',
        message: '✅ Ads-only analytics recalculation completed successfully!',
        progress: 100,
        total: 'unlimited'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Ads-only analytics recalculation completed',
      result 
    });
  } catch (error) {
    console.error('Error recalculating ads-only analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard overview data
router.get('/dashboard', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];


    const summary = await analyticsService.getSummaryStats(startDate, endDate);
    const analytics = await analyticsService.getAnalyticsRange(startDate, endDate);

    res.json({
      summary,
      analytics,
      period: parseInt(period),
      dateRange: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Manual Product-Campaign Links Routes
router.get('/product-campaign-links', async (req, res) => {
	try {
		const { data, error } = await supabase
			.from('product_campaign_links')
			.select('*')
			.eq('is_active', true)
			.order('created_at', { ascending: false });

		if (error) throw error;
		res.json(data);
	} catch (error) {
		console.error('Error fetching product-campaign links:', error);
		res.status(500).json({ error: 'Failed to fetch product-campaign links' });
	}
});

router.post('/product-campaign-links', async (req, res) => {
	try {
		const { product_id, product_title, campaign_id, campaign_name, platform } = req.body;

		// Get campaign name from ad_campaigns table if not provided
		let finalCampaignName = campaign_name;
		if (!finalCampaignName) {
			const { data: campaignData } = await supabase
				.from('ad_campaigns')
				.select('campaign_name')
				.eq('campaign_id', campaign_id)
				.single();
			
			if (campaignData) {
				finalCampaignName = campaignData.campaign_name;
			}
		}

		// Check if link already exists
		const { data: existingLink } = await supabase
			.from('product_campaign_links')
			.select('id')
			.eq('product_id', product_id)
			.eq('campaign_id', campaign_id)
			.single();

		if (existingLink) {
			// Update existing link
			const { error } = await supabase
				.from('product_campaign_links')
				.update({ 
					is_active: true, 
					campaign_name: finalCampaignName,
					updated_at: new Date() 
				})
				.eq('id', existingLink.id);

			if (error) throw error;
		} else {
			// Create new link
			const { error } = await supabase
				.from('product_campaign_links')
				.insert({
					product_id,
					product_title,
					campaign_id,
					campaign_name: finalCampaignName,
					platform
				});

			if (error) throw error;
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Error creating product-campaign link:', error);
		res.status(500).json({ error: 'Failed to create product-campaign link' });
	}
});

router.delete('/product-campaign-links/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const { error } = await supabase
			.from('product_campaign_links')
			.update({ is_active: false, updated_at: new Date() })
			.eq('id', id);

		if (error) throw error;
		res.json({ success: true });
	} catch (error) {
		console.error('Error deleting product-campaign link:', error);
		res.status(500).json({ error: 'Failed to delete product-campaign link' });
	}
});

router.get('/available-campaigns', async (req, res) => {
	try {
		const { data, error } = await supabase
			.from('ad_campaigns')
			.select('campaign_id, campaign_name, platform')
			.eq('status', 'active')
			.order('campaign_id');

		if (error) throw error;

		// Transform to match expected format
		const campaigns = data.map(campaign => ({
			campaign_id: campaign.campaign_id,
			campaign_name: campaign.campaign_name,
			platform: campaign.platform
		}));

		res.json(campaigns);
	} catch (error) {
		console.error('Error fetching available campaigns:', error);
		res.status(500).json({ error: 'Failed to fetch available campaigns' });
	}
});

module.exports = router; 