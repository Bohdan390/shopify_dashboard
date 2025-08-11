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
		const { startDate, endDate, storeId = 'buycosari' } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		const analytics = await analyticsService.getAnalyticsRange(startDate, endDate, storeId);
		res.json(analytics);
	} catch (error) {
		console.error('Error fetching daily analytics:', error);
		res.status(500).json({ error: error.message });
	}
});

// Get summary statistics
router.get('/summary', async (req, res) => {
	try {
		const { startDate, endDate, storeId = 'buycosari' } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		const summary = await analyticsService.getSummaryStats(startDate, endDate, storeId);
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
		const io = req.app.get('io');
		const socket = socketId ? io.sockets.sockets.get(socketId) : null;

		console.log('🔄 Recalculating analytics from date:', recalcDate, 'for store:', storeId);
		const result = await analyticsService.recalculateAnalyticsFromDate(recalcDate, socket, true, storeId);

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

// Recalculate orders/revenue only (fast)
router.post('/recalculate-orders-only', async (req, res) => {
	try {
		const { recalcDate, socketId, storeId = 'buycosari' } = req.body;

		if (!recalcDate) {
			return res.status(400).json({ error: 'recalcDate is required' });
		}

		// Get the socket instance from the request
		const io = req.app.get('io');
		const socket = socketId ? io.sockets.sockets.get(socketId) : null;

		console.log('🔄 Recalculating ORDERS ONLY from date:', recalcDate, 'for store:', storeId);
		const result = await analyticsService.recalculateOrdersOnlyFromDate(recalcDate, socket, true, storeId);

		// Emit final completion
		if (socket) {
			socket.emit('recalcProgress', {
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
		const io = req.app.get('io');
		const socket = socketId ? io.sockets.sockets.get(socketId) : null;

		console.log('🔄 Recalculating ads-only analytics...');
		if (startDate && endDate) {
			console.log(`📅 Date range: ${startDate} to ${endDate}`);
		}

		const result = await analyticsService.recalculateAdsOnlyAnalytics(socket, 'recalcProgress', startDate, endDate, storeId);

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

// Recalculate product trends
router.post('/recalculate-product-trends', async (req, res) => {
	try {
		const { startDate, endDate, socketId, storeId = 'buycosari' } = req.body;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		// Get the socket instance from the request
		const io = req.app.get('io');
		const socket = socketId ? io.sockets.sockets.get(socketId) : null;

		console.log('🔄 Recalculating product trends for date range:', startDate, 'to', endDate, 'for store:', storeId);

		const result = await analyticsService.recalculateAllProductTrends(socket, startDate, endDate, storeId);

		// Emit final completion
		if (socket) {
			socket.emit('productTrendsProgress', {
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

// Customer LTV Cohort Analysis Routes

// Get customer LTV cohorts
router.get('/customer-ltv-cohorts', async (req, res) => {
	try {
		const { storeId = 'buycosari', startDate, endDate, metric = 'revenue' } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({
				success: false,
				message: 'startDate and endDate are required'
			});
		}

		console.log('🔍 Fetching customer LTV cohorts for store:', storeId);
		console.log('📅 Date range:', startDate, 'to', endDate);
		console.log('📊 Metric:', metric);

		// Get customer LTV cohorts directly from the table

		var {count: customerLtvCohortsCount} = await supabase
			.from('customer_ltv_cohorts')
			.select('*', {count: 'exact', head: true})
			.eq('store_id', storeId)
			.gte('cohort_month', startDate)
			.lte('cohort_month', endDate);

		console.log(customerLtvCohortsCount, "customerLtvCohortsCount")

		var chunkSize = 1000;
		var allCustomerLtvCohorts = [];
		for (var i = 0; i < customerLtvCohortsCount; i += chunkSize) {
			const { data: customerLtvCohorts, error: customerLtvCohortsError } = await supabase
				.from('customer_ltv_cohorts')
				.select('*')
				.eq('store_id', storeId)
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
		uniqueDates.forEach((date) => {
			var docs = allCustomerLtvCohorts.filter(cohort => cohort.cohort_month === date && cohort.months_since_first <= monthDiff);
			for (var i = 0; i < monthDiff; i++) {
				var row = docs.find(cohort => cohort.months_since_first === i);
				var value = 0;
				if (row) {
					value = metric === 'profit-ltv' ? row.avg_profit_per_customer : row.avg_revenue_per_customer;
				}
				if (!returnData.has(date)) {
					returnData.set(date, {
						cohortMonth: date,
						cohortMonthDisplay: formatMonthDisplay(date),
						month0: value || 0,
						totalValue: value || 0,
						customerCount: row ? row.customer_count : 0,
						cac: row ? row.cac : 0,
						retentionRate: row ? row.retention_rate : 0
					});
				}
				else {
					cohort = returnData.get(date);
					cohort[`month${i}`] = value || 0;
					cohort.totalValue += value || 0;
				}
			}
		})

		console.log('📊 Customer LTV cohorts data received:', returnData.size, 'cohorts');

		res.json({
			success: true,
			data: Array.from(returnData.values()),
			message: 'Customer LTV cohorts fetched successfully'
		});

	} catch (error) {
		console.error('❌ Error fetching customer LTV cohorts:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to fetch customer LTV cohorts',
			error: error.message
		});
	}
});

// Helper function to format month display
function formatMonthDisplay(monthStr) {
	const [year, month] = monthStr.split('-');
	const date = new Date(parseInt(year), parseInt(month) - 1);
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

// Sync customer LTV cohorts
router.post('/sync-customer-ltv-cohorts', async (req, res) => {
	try {
		const { storeId = 'buycosari', startDate, endDate } = req.body;

		if (!startDate || !endDate) {
			return res.status(400).json({
				success: false,
				message: 'startDate and endDate are required'
			});
		}

		console.log('🔄 Syncing customer LTV cohorts for store:', storeId);
		console.log('📅 Date range:', startDate, 'to', endDate);

		// Clear existing data for the date range
		const { error: deleteError } = await supabase
			.from('customer_ltv_cohorts')
			.delete()
			.eq('store_id', storeId)
			.gte('cohort_month', startDate)
			.lte('cohort_month', endDate);

		if (deleteError) {
			console.error('❌ Error clearing existing data:', deleteError);
			throw deleteError;
		}

		// Calculate and insert new customer LTV cohorts
		const result = await calculateCustomerLtvCohorts(storeId, startDate, endDate);

		if (result.success) {
			console.log('✅ Customer LTV cohorts sync completed');
			res.json({
				success: true,
				message: 'Customer LTV cohorts synced successfully',
				data: result
			});
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
async function calculateCustomerLtvCohorts(storeId, startDate, endDate) {
	try {
		// Get all orders for the store to determine customer first order dates
		var date = new Date();
		var chunkSize = 1000;
		const { count: rangeOrderCount } = await supabase
			.from('orders')
			.select('*', { count: 'exact', head: true })
			.eq('store_id', storeId)
			.gte('created_at', `${startDate}-01T00:00:00Z`)
			.lte('created_at', `${endDate}-31T23:59:59Z`);

		console.log('🔍 Range order count:', rangeOrderCount);

		var rangeOrders = [];
		for (let i = 0; i < rangeOrderCount; i += chunkSize) {
			const { data: rangeOrdersItems, error: rangeOrdersError } = await supabase
				.from('orders')
				.select('customer_id, total_price, created_at')
				.eq('store_id', storeId)
				.gte('created_at', `${startDate}-01T00:00:00Z`)
				.lte('created_at', `${endDate}-31T23:59:59Z`)
				.range(i, i + chunkSize - 1);

			if (rangeOrdersError) throw rangeOrdersError;
			rangeOrders.push(...rangeOrdersItems);
		}

		const { count: customerCount } = await supabase
			.from('customers')
			.select('*', { count: 'exact', head: true })
			.eq('store_id', storeId)
			.gte('first_order_date', `${startDate}-01T00:00:00Z`)
			.lte('first_order_date', `${endDate}-31T23:59:59Z`);

		console.log(startDate, endDate, "startDate, endDate")
		console.log('🔍 Customer count:', customerCount);

		var allCustomers = [];
		for (var i = 0; i < customerCount; i += chunkSize) {
			const { data: customers, error: customersError } = await supabase
				.from('customers')
				.select('customer_id, first_order_date')
				.eq('store_id', storeId)
				.gte('first_order_date', `${startDate}-01T00:00:00Z`)
				.lte('first_order_date', `${endDate}-31T23:59:59Z`)
				.range(i, i + chunkSize - 1);

			if (customersError) throw customersError;

			allCustomers.push(...customers);
		}


		var startYear = startDate.split('-')[0];
		var startMonth = startDate.split('-')[1];
		var endYear = endDate.split('-')[0];
		var endMonth = endDate.split('-')[1];
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
			console.log(customers.length, allCustomers.length, uniqueDate)
			uniqueDates.forEach((date, i) => {
				var orders = rangeOrders.filter(order => customerIds.includes(order.customer_id) && date === order.created_at.substring(0, 7));
				var totalRevenue = orders.reduce((sum, order) => sum + order.total_price, 0) || 0;
				var totalProfit = orders.reduce((sum, order) => sum + order.total_price - order.total_tax - order.total_discounts, 0) || 0;
				var avgRevenuePerCustomer = totalRevenue / customers.length || 0;
				var avgProfitPerCustomer = totalProfit / customers.length || 0;
				var cac = totalRevenue / customers.length || 0;
				var retentionRate = customers.length / allCustomers.length || 0;
				ltvData.push({
					store_id: storeId,
					cohort_month: uniqueDate,
					months_since_first: i,
					customer_count: customers.length,
					total_revenue: totalRevenue,
					total_profit: totalProfit,
					avg_revenue_per_customer: avgRevenuePerCustomer,
					avg_profit_per_customer: avgProfitPerCustomer,
					cac: cac,
					retention_rate: Math.round(retentionRate * 10) / 10
				});
			})
		}
		await supabase.from('customer_ltv_cohorts').delete().eq('store_id', storeId).gte('cohort_month', startDate).lte('cohort_month', endDate);
		console.log(new Date().getTime() - date.getTime(), "ltvData")
		// console.log(ltvData, "ltvData")
		// ltvData.push({
		//   store_id: storeId,
		//   cohort_month: cohortMonth,
		//   months_since_first: month,
		//   customer_count: customerIds.length,
		//   total_revenue: totalRevenue,
		//   total_profit: totalProfit,
		//   avg_revenue_per_customer: avgRevenuePerCustomer,
		//   avg_profit_per_customer: avgProfitPerCustomer,
		//   cac: cac,
		//   retention_rate: Math.round(retentionRate * 10) / 10
		// });
		// Insert the calculated data
		if (ltvData.length > 0) {
			const { error: insertError } = await supabase
				.from('customer_ltv_cohorts')
				.insert(ltvData);

			if (insertError) throw insertError;
		}

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

module.exports = router; 