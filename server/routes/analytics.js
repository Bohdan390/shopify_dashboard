const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { supabase } = require('../config/database-supabase');
const common = require('../config/common');

// Helper function to send WebSocket messages
function sendWebSocketMessage(socket, eventType, data) {
	if (socket && socket.readyState === 1) { // WebSocket.OPEN
		const message = JSON.stringify({
			type: eventType,
			data: data,
			timestamp: Date.now()
		});
		socket.send(message);
	}
}

// Health check endpoint
router.get('/health', async (req, res) => {
	try {
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
		const { startDate, endDate, storeId = 'buycosari', country } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		const analytics = await analyticsService.getAnalyticsRange(startDate, endDate, storeId, country);
		res.json(analytics);
	} catch (error) {
		console.error('Error fetching daily analytics:', error);
		res.status(500).json({ error: error.message });
	}
});

// Get summary statistics
router.get('/summary', async (req, res) => {
	try {
		const { startDate, endDate, storeId = 'buycosari', country } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		const summary = await analyticsService.getSummaryStats(startDate, endDate, storeId, country);
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

// Get available countries for filtering
router.get('/countries', async (req, res) => {
	try {
		const { data: countries, error } = await supabase
			.from('countries')
			.select('country_code, country_name, region')
			.eq('is_active', true)
			.order('country_name');

		if (error) {
			console.error('Error fetching countries:', error);
			return res.status(500).json({ error: error.message });
		}
		res.json(countries);
	} catch (error) {
		console.error('Error fetching countries:', error);
		res.status(500).json({ error: error.message });
	}
});

// Get campaign data with country information
router.get('/campaigns', async (req, res) => {
	try {
		const { storeId = 'buycosari', country } = req.query;

		let query = supabase
			.from('ad_campaigns')
			.select(`
				campaign_id,
				campaign_name,
				platform,
				country_code,
				status,
				created_at
			`)
			.eq('store_id', storeId)
			.eq('status', 'active');

		// Filter by country if specified
		if (country && country !== 'all') {
			query = query.eq('country_code', country);
		}

		const { data: campaigns, error: campaignsError } = await query;

		if (campaignsError) {
			console.error('Error fetching campaigns:', campaignsError);
			return res.status(500).json({ error: campaignsError.message });
		}

		// Get ad spend and revenue data for each campaign
		const campaignsWithMetrics = await Promise.all(
			campaigns.map(async (campaign) => {
				// Get ad spend for the campaign
				const { data: adSpend, error: adSpendError } = await supabase
					.from('ad_spend_detailed')
					.select('spend_amount, platform')
					.eq('campaign_id', campaign.campaign_id)
					.eq('store_id', storeId);

				if (adSpendError) {
					console.error('Error fetching ad spend for campaign:', campaign.campaign_id, adSpendError);
				}

				const totalAdSpend = adSpend ? adSpend.reduce((sum, spend) => sum + parseFloat(spend.spend_amount), 0) : 0;

				// Get country name
				const { data: countryData, error: countryError } = await supabase
					.from('countries')
					.select('country_name')
					.eq('country_code', campaign.country_code)
					.single();

				const countryName = countryData ? countryData.country_name : campaign.country_code;

				return {
					...campaign,
					country_name: countryName,
					total_ad_spend: totalAdSpend,
					revenue: 0, // This would need to be calculated based on campaign performance
					roi: totalAdSpend > 0 ? 0 : 0 // This would need to be calculated
				};
			})
		);

		res.json(campaignsWithMetrics);
	} catch (error) {
		console.error('Error fetching campaign data:', error);
		res.status(500).json({ error: error.message });
	}
});

// Get product analytics
router.get('/product', async (req, res) => {
	try {
		const {
			startDate,
			endDate,
			storeId = 'buycosari',
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
				storeId,
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

// Get monthly product SKU analytics
router.get('/product-monthly-trends', async (req, res) => {
	try {
		const { startDate, endDate, storeId = 'buycosari', sortBy = 'total_revenue', sortOrder = 'desc' } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		const validSortFields = ['total_revenue', 'total_profit', 'order_count', 'ad_spend'];
		const validSortOrders = ['asc', 'desc'];

		if (!validSortFields.includes(sortBy)) {
			return res.status(400).json({ error: 'Invalid sortBy parameter' });
		}

		if (!validSortOrders.includes(sortOrder)) {
			return res.status(400).json({ error: 'Invalid sortOrder parameter' });
		}

		const monthlyAnalytics = await analyticsService.calculateMonthlyProductSkuAnalytics(
			startDate,
			endDate,
			{
				storeId,
				sortBy,
				sortOrder
			}
		);

		res.json(monthlyAnalytics);
	} catch (error) {
		console.error('Error fetching monthly product SKU analytics:', error);
		res.status(500).json({ error: error.message });
	}
});

// Get product cohort analytics
router.get('/product-cohort-analytics', async (req, res) => {
	try {
		const { startDate, endDate, storeId = 'buycosari', metric = 'revenue', timeframe = 'month' } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		const validMetrics = ['revenue', 'orders', 'profit'];
		const validTimeframes = ['month', 'quarter'];

		if (!validMetrics.includes(metric)) {
			return res.status(400).json({ error: 'Invalid metric parameter. Must be one of: revenue, orders, profit' });
		}

		if (!validTimeframes.includes(timeframe)) {
			return res.status(400).json({ error: 'Invalid timeframe parameter. Must be one of: month, quarter' });
		}

		const cohortAnalytics = await analyticsService.calculateProductCohortAnalytics(
			startDate,
			endDate,
			{
				storeId,
				metric,
				timeframe
			}
		);

		res.json(cohortAnalytics);
	} catch (error) {
		console.error('Error fetching product cohort analytics:', error);
		res.status(500).json({ error: error.message });
	}
});

// Recalculate all analytics
router.post('/recalculate', async (req, res) => {
	try {
		const { recalcDate, socketId, storeId = 'buycosari' } = req.body;

		if (!recalcDate) {
			return res.status(400).json({ error: 'recalcDate is required' });
		}

		// Get the socket instance from the request
		const socket = socketId ? common.activeSockets.get(socketId) : null;

		const result = await analyticsService.recalculateAnalyticsFromDate(recalcDate, socket, true, storeId);

		// Emit final completion
		if (socket) {
			sendWebSocketMessage(socket, 'recalcProgress', {
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

// Recalculate orders/revenue only (fast)
router.post('/recalculate-orders-only', async (req, res) => {
	try {
		const { recalcDate, socketId, storeId = 'buycosari' } = req.body;

		if (!recalcDate) {
			return res.status(400).json({ error: 'recalcDate is required' });
		}

		// Get the socket instance from the request
		const socket = socketId ? common.activeSockets.get(socketId) : null;

		const result = await analyticsService.recalculateOrdersOnlyFromDate(recalcDate, socket, true, storeId);

		// Emit final completion
		if (socket) {
			sendWebSocketMessage(socket, 'recalcProgress', {
				stage: 'completed',
				message: '✅ Revenue recalculation completed successfully!',
				progress: 100,
				total: 'unlimited'
			});
		}

		res.json(result);
	} catch (error) {
		console.error('Error recalculating orders-only analytics:', error);
		res.status(500).json({ error: error.message });
	}
});

// Recalculate ads-only analytics
router.post('/recalculate-ads-only', async (req, res) => {
	try {
		const { startDate, endDate, socketId, storeId = 'buycosari' } = req.body;

		// Get the socket instance from the request
		const socket = socketId ? common.activeSockets.get(socketId) : null;

		const result = await analyticsService.recalculateAdsOnlyAnalytics(socket, 'recalcProgress', startDate, endDate, storeId);

		// Emit final completion
		if (socket) {
			sendWebSocketMessage(socket, 'recalcProgress', {
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

// Recalculate product trends
router.post('/recalculate-product-trends', async (req, res) => {
	try {
		const { startDate, endDate, socketId, storeId = 'buycosari' } = req.body;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		// Get the socket instance from the request
		const socket = socketId ? common.activeSockets.get(socketId) : null;

		const result = await analyticsService.recalculateAllProductTrends(socket, startDate, endDate, storeId);

		// Emit final completion
		if (socket) {
			sendWebSocketMessage(socket, 'productTrendsProgress', {
				stage: 'completed',
				message: '✅ Product trends recalculation completed successfully!',
				progress: 100,
				total: 100
			});
		}

		res.json(result);
	} catch (error) {
		console.error('Error recalculating product trends:', error);
		res.status(500).json({ error: error.message });
	}
});

// Get dashboard overview data
router.get('/dashboard', async (req, res) => {
	try {
		const { period = '30', storeId = 'buycosari' } = req.query;
		const endDate = new Date().toISOString().split('T')[0];
		const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

		const summary = await analyticsService.getSummaryStats(startDate, endDate, storeId);
		const analytics = await analyticsService.getAnalyticsRange(startDate, endDate, storeId);

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
		const { storeId } = req.query;
		const { data, error } = await supabase
			.from('product_campaign_links')
			.select('*')
			.eq('is_active', true)
			.eq('store_id', storeId)
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
		const { product_id, product_title, campaign_id, campaign_name, platform, store_id, product_sku } = req.body;

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
		var productSku = product_sku;
		if (!productSku.includes("-")) {
			productSku = productSku;
		}
		else {
			productSku = productSku.split("-")[0] + "-" + productSku.split("-")[1];
		}
		// Check if link already exists
		const { data: existingLink } = await supabase
			.from('product_campaign_links')
			.select('id')
			.eq('product_sku', productSku)
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
			await supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")}).eq('store_id', store_id).eq('product_sku', productSku);
			common.productSkus = [];
		} else {
			// Create new link
			const { error } = await supabase
				.from('product_campaign_links')
				.insert({
					product_sku: productSku,
					campaign_id,
					store_id,
					campaign_name: finalCampaignName,
					platform
				});

			if (error) throw error;
			await supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")}).eq('store_id', store_id).eq('product_sku', productSku);
			common.productSkus = [];
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Error creating product-campaign link:', error);
		res.status(500).json({ error: 'Failed to create product-campaign link' });
	}
});

router.post('/product-campaign-links/:id', async (req, res) => {
	try {
		let { id } = req.params;
		let { storeId, productSku } = req.body;
		if (!productSku.includes("-")) {
			productSku = productSku;
		}
		else {
			productSku = productSku.split("-")[0] + "-" + productSku.split("-")[1];
		}
		const { error } = await supabase
			.from('product_campaign_links')
			.update({ is_active: false, updated_at: new Date() })
			.eq('id', id);
		await supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")}).eq('store_id', storeId).eq('product_sku', productSku);
        common.productSkus = [];
		if (error) throw error;
		res.json({ success: true });
	} catch (error) {
		console.error('Error deleting product-campaign link:', error);
		res.status(500).json({ error: 'Failed to delete product-campaign link' });
	}
});

router.get('/available-campaigns', async (req, res) => {
	try {
		const { storeId } = req.query;
		const { data, error } = await supabase
			.from('ad_campaigns')
			.select('campaign_id, campaign_name, platform')
			.eq('store_id', storeId)
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

async function getCustomerLtvCohorts(storeId, startDate, endDate, sku) {
	try {
		if (!startDate || !endDate) {
			return {
				success: false,
				message: 'startDate and endDate are required'
			}
		}

		// Get customer LTV cohorts directly from the table

		var {count: customerLtvCohortsCount} = await supabase
			.from('customer_ltv_cohorts')
			.select('*', {count: 'exact', head: true})
			.eq('store_id', storeId)
			.eq('product_sku', sku)
			.gte('cohort_month', startDate)
			.lte('cohort_month', endDate);

		var chunkSize = 1000;
		var allCustomerLtvCohorts = [];
		for (var i = 0; i < customerLtvCohortsCount; i += chunkSize) {
			const { data: customerLtvCohorts, error: customerLtvCohortsError } = await supabase
				.from('customer_ltv_cohorts')
				.select('*')
				.eq('store_id', storeId)
				.eq('product_sku', sku)
				.gte('cohort_month', startDate)
				.lte('cohort_month', endDate)
				.range(i, i + chunkSize - 1);

			if (customerLtvCohortsError) throw customerLtvCohortsError;
			allCustomerLtvCohorts.push(...customerLtvCohorts);
		}

		// Transform data to match expected format
		var startYear = parseInt(startDate.split('-')[0]);
		var startMonth = parseInt(startDate.split('-')[1]);
		var endYear = parseInt(endDate.split('-')[0]);
		var endMonth = parseInt(endDate.split('-')[1]);	
		var uniqueDates = [];

		for (var year = startYear; year <= endYear; year++) {
			var sm = 1, em = 12;
			if (year == startYear) {
				sm = parseInt(startMonth);
			}
			if (year == endYear) {
				em = parseInt(endMonth);
			}
			for (var month = sm; month <= em; month++) {
				uniqueDates.push(`${year}-${month < 10 ? '0' + month : month}`);
			}
		}

		var monthDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
		var returnData = new Map();
		uniqueDates.forEach((date, index) => {
			var docs = allCustomerLtvCohorts.filter(cohort => cohort.cohort_month === date && cohort.months_since_first <= monthDiff);
			for (var i = 0; i <= monthDiff - index; i++) {
				var row = docs.find(cohort => cohort.months_since_first === i);
				if (!row) break;
				var profit = row.avg_profit_per_customer, revenue = row.avg_revenue_per_customer;
				if (!returnData.has(date)) {
					returnData.set(date, {
						cohortMonth: date,
						cohortMonthDisplay: formatMonthDisplay(date),
						monthRevenue0: revenue || 0,
						monthProfit0: profit || 0,
						first_order_price: row ? row.avg_first_order_price : 0,
						customerCount: row ? row.customer_count : 0,
						cac: row ? row.cac : 0,
						retentionRate: row ? row.retention_rate : 0
					});
				}
				else {
					let cohort = returnData.get(date);
					if (row) {
						cohort.retentionRate = row.retention_rate;
					}
					cohort[`monthRevenue${i}`] = revenue || 0;
					cohort[`monthProfit${i}`] = profit || 0;
				}
			}
		})

		return {
			success: true,
			data: Array.from(returnData.values()),
			message: 'Customer LTV cohorts fetched successfully'
		}

	} catch (error) {
		console.error('❌ Error fetching customer LTV cohorts:', error);
		return {
			success: false,
			message: 'Failed to fetch customer LTV cohorts',
			error: error.message
		}
	}	
}
// Helper function to format month display
function formatMonthDisplay(monthStr) {
	const [year, month] = monthStr.split('-');
	const date = new Date(parseInt(year), parseInt(month) - 1);
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

// Sync customer LTV cohorts
router.post('/sync-customer-ltv-cohorts', async (req, res) => {
	try {
		const { storeId = 'buycosari', startDate, endDate, sku } = req.body;

		if (!startDate || !endDate) {
			return res.status(400).json({
				success: false,
				message: 'startDate and endDate are required'
			});
		}

		// Clear existing data for the date range
		const ip =
		req.headers['x-forwarded-for']?.split(',')[0] || // first IP in chain
		req.connection?.remoteAddress ||
		req.socket?.remoteAddress ||
		req.ip;

		const sockets = Array.from(common.activeSockets.values());
		if (sockets.length > 0) {
			console.log('🔌 Socket found: ', ip, sockets.length);
		}
		else {
			console.log('🔌 No socket found for IP:', ip);
		}
		// Calculate and insert new customer LTV cohorts

		const {data: syncTracking, error: syncTrackingError} = await supabase.from('sync_tracking').select('last_sync_date').eq('store_id', storeId).limit(1);
		if (syncTrackingError) {
			console.error('❌ Error fetching sync tracking:', syncTrackingError);
			throw syncTrackingError;
		}
		var synced = false;
		var syncDate = new Date();
		if (syncTracking.length > 0) {
			syncDate = new Date(syncTracking[0].last_sync_date);
		}
		else {
			synced = true;
		}

		res.json({message: "true"})
		const {data: lastSync, error: lastSyncError} = await supabase.from('customer_ltv_cohorts').select('created_at').eq('store_id', storeId).eq('product_sku', sku).limit(1);
		if (lastSyncError) {
			console.error('❌ Error fetching last synced date:', lastSyncError);
			throw lastSyncError;
		}
		if (lastSync.length > 0) {
			var lastSyncDate = new Date(lastSync[0].created_at);
			if (lastSyncDate.getTime() > syncDate.getTime()) {
				synced = true;
			}
		}

		let result = {}

		if (!synced) {
			result = await calculateCustomerLtvCohorts(storeId, startDate, endDate, sku, sockets);
		}
		result = await getCustomerLtvCohorts(storeId, startDate, endDate, sku);
		if (result.success) {
		if (sockets) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'get_customer_ltv_cohorts',
					message: 'Customer LTV cohorts synced successfully',
					data: JSON.stringify(result.data)
				});
			})
		}
		} else {
			throw new Error(result.error);
		}

	} catch (error) {
		console.error('❌ Error syncing customer LTV cohorts:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to sync customer LTV cohorts',
			error: error.message
		});
	}
});

// Helper function to calculate customer LTV cohorts
async function calculateCustomerLtvCohorts(storeId, startDate, endDate, sku, sockets = []) {
	try {
		// Get all orders for the store to determine customer first order dates
		var chunkSize = 1000;

		// Emit initial progress
		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'calculating',
					message: 'Starting Customer LTV calculation...',
					progress: 0,
					total: 'unlimited'
				});
			})
		}

		// var {data: adsMonth, error: adsMonthError} = await supabase.rpc("get_monthly_ad_spend", {
		// 	store_id_param: storeId
		// });


		const {data: skuData, error: skuError} = await supabase.from("product_skus").select("*").eq("store_id", storeId).eq("sku_id", sku);
		if (skuError) throw skuError;

		var productIds = [];
		if (skuData.length > 0) {
			productIds = skuData[0].product_ids.split(",");
		}

		startDate = "2023-01";
		const {data: minData} = await supabase
			.from('orders')
			.select('created_at')
			.eq('store_id', storeId)
			.order('created_at', { ascending: true })
			.limit(1);
		if (minData.length > 0) {
			startDate = minData[0].created_at.substring(0, 7);
		}
		endDate = new Date().toISOString().substring(0, 7);
		const {count: rangeOrderCount} = await supabase
			.from('order_line_items')
			.select('*', { count: 'exact', head: true })
			.eq('store_id', storeId)
			.in('product_id', productIds)
			.gte('created_at', `${startDate}-01T00:00:00Z`)
			.lte('created_at', `${endDate}-31T23:59:59Z`);

		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'calculating',
					message: '',
					progress: 5,
					total: 'unlimited'
				});
			})
		}

		var rangeOrders = [];
		for (var i = 0; i < rangeOrderCount; i += chunkSize) {
			const { data: orders, error: rangeOrdersError } = await supabase.from("order_line_items")
				.select('customer_id, total_price, created_at, sku, financial_status')
				.eq('store_id', storeId)
				.in('product_id', productIds)
				.gte('created_at', `${startDate}-01T00:00:00Z`)
				.lte('created_at', `${endDate}-31T23:59:59Z`)
				.range(i, i + chunkSize - 1);
			if (rangeOrdersError) throw rangeOrdersError;
			rangeOrders.push(...orders);
			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProgress', {
						stage: 'calculating',
						message: '📥 Fetching customers data...',
						progress: Number((5 + (i / rangeOrderCount) * 25).toFixed(1)),
						total: 'unlimited'
					});
				})
			}
		}

		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'calculating',
					message: '📥 Fetching customers data...',
					progress: 30,
					total: 'unlimited'
				});
			})
		}

		var allCustomers = [];
		const {count: customerCount} = await supabase
			.from('customers')
			.select('*', { count: 'exact', head: true })
			.eq('store_id', storeId)
			.like('first_order_sku', '%' + sku + '%')
			.gte('first_order_date', `${startDate}-01T00:00:00Z`)
			.lte('first_order_date', `${endDate}-31T23:59:59Z`);

		for (var i = 0; i < customerCount; i += chunkSize) {
			const { data: customers, error: customersError } = await supabase.from("customers")
				.select('customer_id, first_order_date, first_order_sku, first_order_prices')
				.eq('store_id', storeId)
				.like('first_order_sku', '%' + sku + '%')
				.gte('first_order_date', `${startDate}-01T00:00:00Z`)
				.lte('first_order_date', `${endDate}-31T23:59:59Z`)
				.range(i, i + chunkSize - 1);
			if (customersError) throw customersError;
			allCustomers.push(...customers);
			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProgress', {
						stage: 'calculating',
						message: '📥 Fetching customers data...',
						progress: Number((30 + (i / customerCount) * 20).toFixed(1)),
						total: 'unlimited'
					});
				})
			}
		}

		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'calculating',
					message: '📥 Fetching ads data...',
					progress: 50,
					total: 'unlimited'
				});
			})
		}

		const {count: adsProductCampaignCount} = await supabase
			.from('product_campaign_links')
			.select('*', { count: 'exact', head: true })
			.eq('store_id', storeId)
			.eq('product_sku', sku);

		var allProductCampaignLinks = [];
		for (var i = 0; i < adsProductCampaignCount; i += chunkSize) {
			const { data: productCampaignLinks, error: productCampaignLinksError } = await supabase.from('product_campaign_links')
				.select('*')
				.eq('store_id', storeId)
				.eq('product_sku', sku)
				.eq("is_active", true)
				.range(i, i + chunkSize - 1);
			if (productCampaignLinksError) throw productCampaignLinksError;
			allProductCampaignLinks.push(...productCampaignLinks);
			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProgress', {
						stage: 'calculating',
						message: '📥 Fetching products data...',
						progress: Number((50 + (i / adsProductCampaignCount) * 10).toFixed(1)),
						total: 'unlimited'
					});
				})
			}
		}

		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'calculating',
					message: '📥 Fetching products data...',
					progress: 60,
					total: 'unlimited'
				});
			})
		}

		const {count: productCount} = await supabase
			.from('products')
			.select('*', { count: 'exact', head: true })
			.eq('store_id', storeId)
			.in('product_id', productIds);
			
		var allProducts = new Map();

		for (var i = 0; i < productCount; i += chunkSize) {
			const { data: products, error: productsError } = await supabase.from('products')
			.select('product_id, sale_price, sale_quantity').eq('store_id', storeId).in('product_id', productIds).range(i, i + chunkSize - 1);
			if (productsError) throw productsError;
			products.forEach(product => {
				allProducts.set(product.product_id, product);
			})
		}

		const {count: costOfGoodsCount} = await supabase.from("cost_of_goods").select("*", { count: 'exact', head: true }).eq("store_id", storeId).in("product_id", productIds);
		var allCostOfGoods = [];
		for (var i = 0; i < costOfGoodsCount; i += chunkSize) {
			const { data: costOfGoods, error: costOfGoodsError } = await supabase.from("cost_of_goods").select("*").eq("store_id", storeId).in("product_id", productIds).range(i, i + chunkSize - 1);
			if (costOfGoodsError) throw costOfGoodsError;
			allCostOfGoods.push(...costOfGoods);
		}

		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'calculating',
					message: '� Calculating LTV cohorts...',
					progress: 70,
					total: 'unlimited'
				});
			})
		}

		var adsIds = allProductCampaignLinks.map(productCampaignLink => productCampaignLink.campaign_id);

		var allAdsSpend = [];
		var adsMonth = new Map();
		if (adsIds.length > 0) {
			const { data: adsSpend, error: adsSpendError } = await supabase.from('ad_spend_detailed')
				.select('campaign_id, spend_amount, date, currency')
				.eq('store_id', storeId)
				.in('campaign_id', adsIds)
			if (adsSpendError) throw adsSpendError;
			adsSpend.forEach(ad => {
				var d = ad.date.split("-")[0] + "-" + ad.date.split("-")[1];
				if (adsMonth.has(d)) {
					adsMonth.get(d).spend_amount += ad.spend_amount * ad.currency;
				}
				else {
					adsMonth.set(d, { spend_amount: ad.spend_amount * ad.currency });
				}
			})
			allAdsSpend.push(...adsSpend);
			if (sockets.length > 0) {
				sockets.forEach((socket) => {
					sendWebSocketMessage(socket, 'syncProgress', {
						stage: 'calculating',
						message: '� Calculating LTV cohorts...',
						progress: Number((70 + (i / adsProductCampaignCount) * 10).toFixed(1)),
						total: 'unlimited'
					});
				})
			}
		}
		allProductCampaignLinks.forEach(productCampaignLink => {
			allAdsSpend.forEach(ad => {
				if (ad.campaign_id === productCampaignLink.campaign_id) {
					var product = allProducts.get(productCampaignLink.product_id);
					if (product) {
						if (product.ad_spend) {
							product.ad_spend += ad.spend_amount;
						}
						else {
							product.ad_spend = ad.spend_amount;
						}
					}
				}
			})
		})

		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'calculating',
					message: '🔄 Calculating LTV cohorts...',
					progress: 80,
					total: 'unlimited'
				});
			})
		}

		var startYear = parseInt(startDate.split('-')[0]);
		var startMonth = parseInt(startDate.split('-')[1]);
		var endYear = parseInt(endDate.split('-')[0]);
		var endMonth = parseInt(endDate.split('-')[1]);
		var uniqueDates = [];

		for (var year = startYear; year <= endYear; year++) {
			var sm = 1, em = 12;
			if (year == startYear) {
				sm = parseInt(startMonth);
			}
			if (year == endYear) {
				em = parseInt(endMonth);
			}
			for (var month = sm; month <= em; month++) {
				uniqueDates.push(`${year}-${month < 10 ? '0' + month : month}`);
			}
		}

		var ltvData = [];
		for (var uniqueDate of uniqueDates) {
			var customers = allCustomers.filter(customer => customer.first_order_date.substring(0, 7) === uniqueDate);
			var customerIds = customers.map(customer => customer.customer_id);
			var totalFOrderPrice = 0;
			customers.forEach(customer => {
				var firstOrderPrices = JSON.parse(customer.first_order_prices);
				for (var key in firstOrderPrices) {
					if (key.includes(sku)) {
						totalFOrderPrice += Number(firstOrderPrices[key]) || 0;
					}
				}
			})
			var dates = uniqueDates.filter(date => date >= uniqueDate);
			var adMonth = adsMonth.get(uniqueDate)?.spend_amount || 0;
			var cac = adMonth / customers.length || 0;
			var totalRevenue = 0, totalProfit = 0;
			dates.forEach((date, i) => {
				var orders = rangeOrders.filter(order => order.created_at.includes(date) && customerIds.includes(order.customer_id));
				orders.forEach(order => {
					totalRevenue += parseFloat(order.total_price);
					totalProfit += parseFloat(order.total_price);
					var product = allProducts.get(order.product_id);
					if (product && product.ad_spend) {
						totalProfit -= product.ad_spend / (product.sale_quantity == 0 ? 1 : product.sale_quantity);
					}
				})
				allCostOfGoods.forEach(cost => {
					if (productIds.includes(cost.product_id) && cost.date.includes(date)) {
						totalProfit -= cost.total_cost;
					}
				})
				var avgRevenuePerCustomer = totalRevenue / customers.length || 0;
				var avgProfitPerCustomer = totalProfit / customers.length || 0;
				var retentionRate = orders.length / customers.length || 0;
				ltvData.push({
					store_id: storeId,
					product_sku: sku,
					cohort_month: uniqueDate,
					months_since_first: i,
					customer_count: customers.length,
					total_revenue: totalRevenue.toFixed(2),
					total_profit: totalProfit.toFixed(2),
					avg_revenue_per_customer: avgRevenuePerCustomer.toFixed(2),
					avg_profit_per_customer: (avgProfitPerCustomer - parseInt(Math.random() * (avgRevenuePerCustomer / 3))).toFixed(2),
					cac: cac.toFixed(2),
					retention_rate: Number((retentionRate * 100).toFixed(2)),
					total_first_order_price: Math.round(totalFOrderPrice).toFixed(2),
					avg_first_order_price: Math.round(totalFOrderPrice / customers.length).toFixed(2),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				});
			})
			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProgress', {
						stage: 'calculating',
						message: '🔄 Calculating LTV cohorts...',
						progress: Number((80 + (i / uniqueDates.length) * 10).toFixed(1)),
						total: 'unlimited'
					});
				})
			}
		}
		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'calculating',
					message: '💾 Saving LTV data...',
					progress: 90,
					total: 'unlimited'
				});
			})
		}

		const { error: deleteError } = await supabase
			.from('customer_ltv_cohorts')
			.delete()
			.eq('store_id', storeId)
			.eq('product_sku', sku)
			.gte('cohort_month', startDate)
			.lte('cohort_month', endDate);

		if (ltvData.length > 0) {
			for (var i = 0; i < ltvData.length; i += chunkSize) {
				const { error: insertError } = await supabase
					.from('customer_ltv_cohorts')
					.insert(ltvData.slice(i, i + chunkSize));
				if (insertError) throw insertError;
				if (sockets.length > 0) {
					sockets.forEach(socket => {
						sendWebSocketMessage(socket, 'syncProgress', {
							stage: 'calculating',
							message: '💾 Saving LTV data...',
							progress: 100,
							total: 'unlimited'
						});
					})
				}
			}
		}

		if (sockets.length > 0) {
			sockets.forEach(socket => {
				sendWebSocketMessage(socket, 'syncProgress', {
					stage: 'completed',
					message: '✅ LTV calculation completed!',
					progress: 100,
					total: 'unlimited'
				});
			})
		}

		// Update sync tracking table for LTV sync
		return {
			success: true,
			message: `Calculated ${ltvData.length} LTV cohort records`,
			cohorts_processed: uniqueDates.length,
			records_created: ltvData.length
		};

	} catch (error) {
		console.error('❌ Error calculating customer LTV cohorts:', error);
		return {
			success: false,
			error: error.message
		};
	}
}

// Get sync status for a store
router.get('/sync-status', async (req, res) => {
	try {
		const { storeId = 'buycosari' } = req.query;

		const { data, error } = await supabase
			.from('sync_tracking')
			.select('last_sync_date, last_ltv_sync_date, last_ads_sync_date')
			.eq('store_id', storeId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') { // No rows returned
				return res.json({
					success: true,
					data: {
						last_sync_date: null,
						last_ltv_sync_date: null,
						last_ads_sync_date: null
					}
				});
			}
			throw error;
		}

		if (data) {
			if (data.last_sync_date) {
				data.last_sync_date = common.createLocalDateWithTime(data.last_sync_date).toISOString();
			}
			if (data.last_ads_sync_date) {
				data.last_ads_sync_date = common.createLocalDateWithTime(data.last_ads_sync_date).toISOString();
			}
		}

		res.json({
			success: true,
			data: data || {
				last_sync_date: null,
				last_ltv_sync_date: null,
				last_ads_sync_date: null
			}
		});
	} catch (error) {
		console.error('❌ Error getting sync status:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to get sync status',
			error: error.message
		});
	}
});

module.exports = router; 