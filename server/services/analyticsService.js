const { supabase, insert, update, select } = require('../config/database-supabase');
const common = require('../config/common');

// Helper function to retry database operations
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			console.error(`❌ Attempt ${attempt} failed:`, error.message);

			if (attempt === maxRetries) {
				throw error;
			}

			await new Promise(resolve => setTimeout(resolve, delay));
			delay *= 2; // Exponential backoff
		}
	}
};

class AnalyticsService {
	async calculateDailyAnalytics(date, storeId = 'buycosari') {
		try {
			// Get revenue for the date
			const { data: revenueData, error: revenueError } = await supabase
				.from('orders')
				.select('total_price')
				.eq('financial_status', 'paid')
				.eq('store_id', storeId)
				.gte('created_at', `${date}T00:00:00`)
				.lt('created_at', `${date}T23:59:59.999`);

			if (revenueError) throw revenueError;
			const revenue = revenueData.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

			// Get Google Ads spend
			const { data: googleAdsData, error: googleAdsError } = await supabase
				.from('ad_spend_detailed')
				.select('spend_amount')
				.eq('date', date)
				.eq('platform', 'google')
				.eq('store_id', storeId);

			if (googleAdsError) throw googleAdsError;
			const googleAdsSpend = googleAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);

			// Get Facebook Ads spend
			const { data: facebookAdsData, error: facebookAdsError } = await supabase
				.from('ad_spend_detailed')
				.select('spend_amount')
				.eq('date', date)
				.eq('platform', 'facebook')
				.eq('store_id', storeId);

			if (facebookAdsError) throw facebookAdsError;
			const facebookAdsSpend = facebookAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);

			// Get cost of goods
			const { data: cogData, error: cogError } = await supabase
				.from('cost_of_goods')
				.select('total_cost')
				.eq('date', date)
				.eq('store_id', storeId);

			if (cogError) throw cogError;
			const costOfGoods = cogData.reduce((sum, cog) => sum + parseFloat(cog.total_cost), 0);

			// Calculate profit
			const totalAdSpend = googleAdsSpend + facebookAdsSpend;
			const profit = revenue - totalAdSpend - costOfGoods;
			const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

			// Upsert analytics data
			const analyticsData = {
				date,
				store_id: storeId,
				revenue: common.roundPrice(revenue),
				google_ads_spend: common.roundPrice(googleAdsSpend),
				facebook_ads_spend: common.roundPrice(facebookAdsSpend),
				cost_of_goods: common.roundPrice(costOfGoods),
				profit: common.roundPrice(profit),
				profit_margin: common.roundPrice(profitMargin)
			};

			console.log(analyticsData)
			// Delete existing record for this date first, then insert new one
			try {
				// Delete existing analytics for this date
				const { error: deleteError } = await supabase
					.from('analytics')
					.delete()
					.eq('date', date)
					.eq('store_id', storeId);

				if (deleteError) {
					console.error(`❌ Error deleting existing analytics for ${date}:`, deleteError);
					throw deleteError;
				}

				// Insert new analytics data
				const { error: insertError } = await supabase
					.from('analytics')
					.insert(analyticsData);

				if (insertError) {
					console.error(`❌ Error inserting analytics for ${date}:`, insertError);
					throw insertError;
				}

			} catch (error) {
				console.error(`❌ Error updating analytics for ${date}:`, error);
				throw error;
			}

			return {
				date,
				revenue,
				googleAdsSpend,
				facebookAdsSpend,
				costOfGoods,
				profit,
				profitMargin
			};
		} catch (error) {
			console.error('Error calculating daily analytics:', error);
			throw error;
		}
	}

	async getAnalyticsRange(startDate, endDate, storeId = 'buycosari') {
		try {
			return await retryOperation(async () => {

				const { data, error } = await supabase
					.from('analytics')
					.select('*')
					.eq('store_id', storeId)
					.gte('date', `${startDate}T00:00:00`)
					.lte('date', `${endDate}T23:59:59.999`)
					.order('date');

				if (error) {
					console.error('❌ Error fetching analytics data:', error);
					throw error;
				}

				// Generate complete date range with $0 values for missing days
				const completeData = this.generateCompleteDateRange(startDate, endDate, data);

				return completeData;
			});
		} catch (error) {
			console.error('❌ Error getting analytics range:', error);
			console.error('Error details:', {
				message: error.message,
				details: error.stack,
				hint: 'Check Supabase connection and table existence',
				code: error.code
			});
			throw error;
		}
	}

	// Helper function to create local dates without timezone issues

	generateCompleteDateRange(startDate, endDate, existingData) {
		// Parse dates as local dates to avoid timezone issues
		const start = common.createLocalDate(startDate);
		const end = common.createLocalDate(endDate);
		const completeData = [];

		// Create a map of existing data for quick lookup
		const existingDataMap = {};
		existingData.forEach(item => {
			existingDataMap[item.date] = item;
		});

		// Generate all dates in the range (inclusive of end date)
		const currentDate = new Date(start);
		const endDateObj = new Date(end);

		while (currentDate <= endDateObj) {
			const dateString = currentDate.toISOString().split('T')[0];

			if (existingDataMap[dateString]) {
				// Use existing data
				completeData.push(existingDataMap[dateString]);
			} else {
				// Create $0 entry for missing day
				completeData.push({
					date: dateString,
					revenue: 0,
					google_ads_spend: 0,
					facebook_ads_spend: 0,
					cost_of_goods: 0,
					profit: 0,
					profit_margin: 0
				});
			}

			// Move to next day
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return completeData;
	}

	async getSummaryStats(startDate, endDate, storeId = 'buycosari') {
		try {
			return await retryOperation(async () => {
				// Get analytics data with chunking
				let allAnalyticsData = [];
				let offset = 0;
				const chunkSize = 1000;
				let hasMoreData = true;

				while (hasMoreData) {
					const { data: analyticsChunk, error: analyticsError } = await supabase
						.from('analytics')
						.select('revenue, google_ads_spend, facebook_ads_spend, cost_of_goods, profit')
						.eq('store_id', storeId)
						.gte('date', `${startDate}T00:00:00`)
						.lte('date', `${endDate}T23:59:59.999`)
						.range(offset, offset + chunkSize - 1);

					if (analyticsError) {
						console.error('❌ Error fetching analytics data:', analyticsError);
						throw analyticsError;
					}

					if (analyticsChunk && analyticsChunk.length > 0) {
						allAnalyticsData = allAnalyticsData.concat(analyticsChunk);
						offset += chunkSize;
					} else {
						hasMoreData = false;
					}
				}

				// Get total order count (no chunking needed for count)
				const stats = await supabase.rpc('get_orders_price_stats', {
					p_store_id: storeId,
					p_start_date: startDate + 'T00:00:00',
					p_end_date: endDate + 'T23:59:59.999'
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
				const summary = allAnalyticsData.reduce((acc, row) => {
					acc.totalGoogleAds += parseFloat(row.google_ads_spend || 0);
					acc.totalFacebookAds += parseFloat(row.facebook_ads_spend || 0);
					acc.totalCostOfGoods += parseFloat(row.cost_of_goods || 0);
					acc.totalProfit += parseFloat(row.profit || 0);
					return acc;
				}, {
					totalRevenue: 0,
					totalGoogleAds: 0,
					totalFacebookAds: 0,
					totalCostOfGoods: 0,
					totalProfit: 0,
					totalOrders: data.totalOrders || 0,
					paidOrders: data.paidOrders || 0
				});

				summary.totalRevenue = data.totalRevenue;
				summary.averageProfitMargin = summary.totalRevenue > 0
					? (summary.totalProfit / summary.totalRevenue) * 100
					: 0;

				return summary;
			});
		} catch (error) {
			console.error('❌ Error getting summary stats:', error);
			console.error('Error details:', {
				message: error.message,
				details: error.stack,
				hint: 'Check Supabase connection and table existence',
				code: error.code
			});
			throw error;
		}
	}

	async recalculateAllAnalytics(socket = null) {
		try {
			if (socket) {
				socket.emit('recalcProgress', {
					stage: 'starting',
					message: '🔄 Starting analytics recalculation...',
					progress: 0,
					total: 0
				});
			}

			const { count, error: countError } = await supabase
				.from('orders')
				.select('*', { count: 'exact', head: true });

			if (countError) throw countError;

			let chunkSize = 1000;
			let orderDates = [];
			for (let i = 0; i < count; i += chunkSize) {
				const { data, error } = await supabase
					.from('orders')
					.select('created_at, total_price')
					.eq('financial_status', 'paid')
					.range(i, i + chunkSize - 1);

				if (error) throw error;
				orderDates.push(...data);
			}

			const uniqueDates = [...new Set(orderDates.map(order =>
				new Date(order.created_at).toISOString().split('T')[0]
			))].sort();

			if (socket) {
				socket.emit('recalcProgress', {
					stage: 'processing',
					message: `📊 Processing ${uniqueDates.length} unique dates...`,
					progress: 10,
					total: uniqueDates.length
				});
			}

			for (let i = 0; i < uniqueDates.length; i++) {
				const date = uniqueDates[i];
				if (socket) {
					const progress = 10 + Math.floor((i / uniqueDates.length) * 80); // Progress from 10% to 90%
					socket.emit('recalcProgress', {
						stage: 'calculating',
						message: `📊 Calculating analytics for ${date}... (${i + 1}/${uniqueDates.length})`,
						progress: progress,
						total: uniqueDates.length,
						current: i + 1
					});
				}

				await this.calculateDailyAnalytics(date);
			}

			if (socket) {
				socket.emit('recalcProgress', {
					stage: 'completed',
					message: '✅ Analytics recalculation completed successfully!',
					progress: 100,
					total: uniqueDates.length,
					processedDates: uniqueDates.length
				});
			}

		} catch (error) {
			console.error('❌ Error recalculating analytics:', error);

			if (socket) {
				socket.emit('recalcProgress', {
					stage: 'error',
					message: `❌ Error recalculating analytics: ${error.message}`,
					progress: 0,
					total: 0,
					error: error.message
				});
			}

			throw error;
		}
	}

	async recalculateAnalyticsFromDate(syncDate, socket = null, isStandaloneRecalc = false, storeId = 'buycosari') {
		try {
			if (socket) {
				const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';
				const initialProgress = isStandaloneRecalc ? 0 : 95;

				socket.emit(eventType, {
					stage: isStandaloneRecalc ? 'starting' : 'analytics',
					message: `🔄 Recalculating analytics from ${syncDate}...`,
					progress: initialProgress,
					total: 0
				});
			}

			// Get min date from paid orders from syncDate onwards
			const { data: minDateData, error: minDateError } = await supabase
				.from('orders')
				.select('created_at')
				.eq('financial_status', 'paid')
				.eq('store_id', storeId)
				.gte('created_at', `${syncDate}T00:00:00`)
				.order('created_at', { ascending: true })
				.limit(1);

			if (minDateError) throw minDateError;

			// Get max date from paid orders from syncDate onwards
			const { data: maxDateData, error: maxDateError } = await supabase
				.from('orders')
				.select('created_at')
				.eq('financial_status', 'paid')
				.eq('store_id', storeId)
				.gte('created_at', `${syncDate}T00:00:00`)
				.order('created_at', { ascending: false })
				.limit(1);

			if (maxDateError) throw maxDateError;

			if (!minDateData || minDateData.length === 0 || !maxDateData || maxDateData.length === 0) {
				if (socket) {
					socket.emit('recalcProgress', {
						stage: 'completed',
						message: '📭 No orders found from sync date, skipping analytics',
						progress: 100,
						total: 0
					});
				}
				return;
			}

			// Generate all dates in the range
			const allDates = [];
			const currentDate = common.createLocalDate(minDateData[0].created_at);
			const endDate = common.createLocalDate(maxDateData[0].created_at);


			while (currentDate <= endDate) {
				allDates.push(currentDate.toISOString().split('T')[0]);
				currentDate.setDate(currentDate.getDate() + 1);
			}

			for (let i = 0; i < allDates.length; i++) {
				const date = allDates[i];
				if (socket) {
					const progress = isStandaloneRecalc
						? Math.floor(((i + 1) / allDates.length) * 100) // Progress from 0% to 100% for standalone
						: 95 + Math.floor(((i + 1) / allDates.length) * 4); // Progress from 95% to 99% for sync

					const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';

					socket.emit(eventType, {
						stage: isStandaloneRecalc ? 'calculating' : 'analytics',
						message: `📊 Calculating analytics for ${date}... (${i + 1}/${allDates.length})`,
						progress: progress,
						total: allDates.length,
						current: i + 1
					});
				}

				await this.calculateDailyAnalytics(date, storeId);
			}

			if (socket) {
				const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';
				const finalProgress = isStandaloneRecalc ? 100 : 99;

				socket.emit(eventType, {
					stage: isStandaloneRecalc ? 'completed' : 'analytics',
					message: '✅ Analytics recalculation completed!',
					progress: finalProgress,
					total: allDates.length,
					processedDates: allDates.length
				});
			}

		} catch (error) {
			console.error('❌ Error recalculating analytics from sync date:', error);

			if (socket) {
				const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';

				socket.emit(eventType, {
					stage: 'error',
					message: `❌ Error recalculating analytics: ${error.message}`,
					progress: 0,
					total: 0,
					error: error.message
				});
			}

			throw error;
		}
	}

	// Month-over-Month Product SKU Analytics
	async calculateMonthlyProductSkuAnalytics(startDate, endDate, options = {}) {
		const {
			storeId = 'buycosari',
			sortBy = 'total_revenue',
			sortOrder = 'desc'
		} = options;

		// Use the retryOperation helper for database resilience
		return retryOperation(async () => {
			try {
				const {data: productTrends, error: productTrendsError} = await supabase
					.from('product_trends')
					.select('*')
					.eq('store_id', storeId)
					.gte('month_year', `${startDate}`)
					.lte('month_year', `${endDate}`)
					.order('year', { ascending: true })
					.order('month', { ascending: true })
					.order('product_sku', { ascending: true });

				if (productTrendsError) throw productTrendsError;

				if (!productTrends || productTrends.length === 0) {
					return {
						success: true,
						data: {},
						message: 'No product trends data found for the specified date range'
					};
				}

				// Group data by product SKU
				const groupedBySku = {};
				productTrends.forEach(trend => {
					const sku = trend.product_sku;
					if (!groupedBySku[sku]) {
						groupedBySku[sku] = [];
					}
					
					// Transform the data to match frontend expectations
					groupedBySku[sku].push({
						month_year: trend.month_year,
						revenue: common.roundPrice(trend.total_revenue) || 0,
						profit: common.roundPrice(trend.total_profit) || 0,
						orders: trend.order_count || 0,
						ad_spend: common.roundPrice(trend.ad_spend) || 0,
						cost_of_goods: common.roundPrice(trend.cost_of_goods) || 0,
						month: trend.month,
						year: trend.year
					});
				});

				// Sort SKUs by the specified criteria
				const sortedSkus = Object.keys(groupedBySku).sort((a, b) => {
					const aTotal = groupedBySku[a].reduce((sum, item) => sum + (item[sortBy] || 0), 0);
					const bTotal = groupedBySku[b].reduce((sum, item) => sum + (item[sortBy] || 0), 0);
					
					return sortOrder === 'desc' ? bTotal - aTotal : aTotal - bTotal;
				});

				// Create sorted result object
				const sortedData = {};
				sortedSkus.forEach(sku => {
					sortedData[sku] = groupedBySku[sku];
				});

				return {
					success: true,
					data: sortedData,
					message: `Successfully retrieved product trends for ${Object.keys(sortedData).length} SKUs`
				};
				
			} catch (error) {
				console.error('❌ Error in monthly product SKU analytics:', error);
				throw error;
			}
		}, 3, 1000); // Retry up to 3 times with 1 second delay
	}

	// Lightweight orders-only recalculation (no ads, no COGS)
	async recalculateOrdersOnlyFromDate(syncDate, socket = null, isStandaloneRecalc = false, storeId = 'buycosari', socketStatus = null) {
		try {
			syncDate = common.createLocalDate(syncDate).toISOString().split('T')[0];
			let initialProgress = 0;
			if (socket) {
				const eventType = isStandaloneRecalc ? 'recalcProgress' : socketStatus;
				initialProgress = 0;
				socket.emit(eventType, {
					stage: isStandaloneRecalc ? 'starting' : 'analytics',
					message: `🔄 Recalculating revenue from ${syncDate}...`,
					progress: initialProgress,
					total: 0
				});
			}

			// Get date range from orders (only paid orders)
			const { data: minDateData, error: minDateError } = await supabase
				.from('orders')
				.select('created_at')
				.neq('financial_status', 'refunded')
				.eq('store_id', storeId)
				.gte('created_at', `${syncDate}T00:00:00`)
				.order('created_at', { ascending: true })
				.limit(1);

			if (minDateError) throw minDateError;

			const { data: maxDateData, error: maxDateError } = await supabase
				.from('orders')
				.select('created_at')
				.neq('financial_status', 'refunded')
				.eq('store_id', storeId)
				.gte('created_at', `${syncDate}T00:00:00`)
				.order('created_at', { ascending: false })
				.limit(1);

			if (maxDateError) throw maxDateError;

			if (!minDateData || minDateData.length === 0 || !maxDateData || maxDateData.length === 0) {
				if (socket) {
					const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';
					socket.emit(eventType, {
						stage: 'completed',
						message: '📭 No orders found from sync date, skipping revenue calculation',
						progress: 100,
						total: 0
					});
				}
				return;
			}

			// Generate all dates in the range
			const allDates = [];
			const currentDate = common.createLocalDate(minDateData[0].created_at);
			const endDate = common.createLocalDate(maxDateData[0].created_at);

			while (currentDate <= endDate) {
				allDates.push(currentDate.toISOString().split('T')[0]);
				currentDate.setDate(currentDate.getDate() + 1);
			}

			// Process each date - ORDERS ONLY (no ads, no COGS)
			let processedCount = 0;
			for (const date of allDates) {
				try {
					// Calculate revenue for this date ONLY
					const { data: revenueData, error: revenueError } = await supabase
						.from('orders')
						.select('total_price, total_tax, total_discounts')
						.eq('financial_status', 'paid')
						.eq('store_id', storeId)
						.gte('created_at', `${date}T00:00:00`)
						.lt('created_at', `${date}T23:59:59.999`);

					if (revenueError) throw revenueError;
					const revenue = revenueData.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

					// Get existing analytics to preserve ads and COGS data
					const { data: existingAnalytics, error: existingError } = await supabase
						.from('analytics')
						.select('*')
						.eq('date', date)
						.eq('store_id', storeId)
						.single();

					if (existingError && existingError.code !== 'PGRST116') throw existingError;

					// Preserve existing ads and COGS data, only update revenue
					let existingGoogleAds = 0;
					let existingFacebookAds = 0;
					let existingCOGS = 0;

					if (existingAnalytics) {
						existingGoogleAds = parseFloat(existingAnalytics.google_ads_spend) || 0;
						existingFacebookAds = parseFloat(existingAnalytics.facebook_ads_spend) || 0;
						existingCOGS = parseFloat(existingAnalytics.cost_of_goods) || 0;
					}

					const totalAdSpend = existingGoogleAds + existingFacebookAds;
					const profit = revenue - totalAdSpend - existingCOGS;
					const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

					// Upsert analytics record - preserve ads/COGS, update revenue
					const analyticsData = {
						date: date,
						store_id: storeId,
						revenue: common.roundPrice(revenue), // Updated revenue
						google_ads_spend: common.roundPrice(existingGoogleAds), // Preserve existing ads
						facebook_ads_spend: common.roundPrice(existingFacebookAds), // Preserve existing ads
						cost_of_goods: common.roundPrice(existingCOGS), // Preserve existing COGS
						profit: common.roundPrice(profit), // Recalculated profit
						profit_margin: common.roundPrice(profitMargin) // Recalculated margin
					};

					const { error: upsertError } = await supabase
						.from('analytics')
						.upsert(analyticsData, { 
							onConflict: 'date,store_id',
							ignoreDuplicates: false 
						});

					if (upsertError) throw upsertError;

					processedCount++;

					// Emit progress
					if (socket) {
						const progress = initialProgress + (processedCount / allDates.length) * 100;
						const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';
						socket.emit(eventType, {
							stage: 'processing',
							message: `📊 Processing revenue for ${date}... (${processedCount}/${allDates.length})`,
							progress: Number(progress.toFixed(1)) > 100 ? 100 : Number(progress.toFixed(1)),
							total: allDates.length,
							current: processedCount
						});
					}

				} catch (dateError) {
					console.error(`❌ Error processing orders for ${date}:`, dateError);
					// Continue with next date instead of failing completely
				}
			}

			if (socket) {
				const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';
				socket.emit(eventType, {
					stage: 'completed',
					message: `✅ Revenue recalculation completed! Processed ${processedCount} days`,
					progress: 100,
					total: allDates.length,
					current: processedCount
				});
			}

			return {
				success: true,
				datesProcessed: processedCount,
				totalDates: allDates.length,
				dateRange: {
					start: allDates[0],
					end: allDates[allDates.length - 1]
				}
			};

		} catch (error) {
			console.error('❌ Error in orders-only recalculation:', error);
			
			if (socket) {
				const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';
				socket.emit(eventType, {
					stage: 'error',
					message: `❌ Error in revenue recalculation: ${error.message}`,
					progress: 0,
					total: 0,
					error: error.message
				});
			}

			throw error;
		}
	}

	// Product Analytics - Match campaigns to products based on order line items
	async calculateProductAnalytics(startDate, endDate, options = {}) {
		const {
			storeId = 'buycosari',
			sortBy = 'total_revenue',
			sortOrder = 'desc',
			search = '',
			page = 1,
			limit = 50
		} = options;

		const { data: productRevenue, error: productRevenueError } = await supabase
		.rpc('aggregate_product_revenue', {
			p_store_id: storeId,
			p_start_date: startDate,
			p_end_date: endDate
		});

		if (productRevenueError) throw productRevenueError;

		console.log(productRevenue)
		var productSkus = [];

		productRevenue.forEach(product => {
			var productSku = product.product_sku_id;
			if (productSku.includes("-")) {
				productSku = productSku.split("-")[0] + "-" + productSku.split("-")[1];
			}
			if (!productSkus.includes(productSku)) {
				productSkus.push(productSku);
			}
		});
		
		// Process and enrich product data
		// Get manual product-campaign links
		const {count: campaignCount} = await supabase
			.from('product_campaign_links')
			.select('*', { count: 'exact', head: true })
			.eq('store_id', storeId)
			.eq('is_active', true)
			.in('product_sku', productSkus);

		var allProductCampaignLinks = [];
		for (var i = 0; i < campaignCount; i += 1000) {
			const { data: manualLinks, error: linksError } = await supabase
				.from('product_campaign_links')
				.select('*')
				.eq('store_id', storeId)
				.eq('is_active', true)
				.in('product_sku', productSkus)
				.range(i, i + 1000 - 1);
			if (linksError) throw linksError;
			allProductCampaignLinks.push(...manualLinks);
		}

		var campaignNames = allProductCampaignLinks.map(link => link.campaign_id);

		const { data: adSpend, error: adSpendError } = await supabase
		.rpc('aggregate_ad_spend_by_campaign', {
			start_date: startDate + 'T00:00:00',
			end_date: endDate + 'T23:59:59.999',
			p_campaign_names: campaignNames
		});

		if (adSpendError) throw adSpendError;

		var productSkus = new Map();
		var totalRevenue = 0, totalProfit = 0, totalAdSpend = 0;
		if (productRevenue.length > 0) {
			productRevenue.forEach(product => {
				var productSku = product.product_sku_id;
				if (productSku.includes("-")) {
					productSku = productSku.split("-")[0] + "-" + productSku.split("-")[1];
				}
				totalRevenue += product.total_revenue;
				if (!productSkus.has(productSku)) {
					productSkus.set(productSku, {
						sku_title: storeId !== "meonutrition" ? product.product_title : common.extractProductSku(product.product_title),
						campaigns: product.campaigns == undefined ? [] : product.campaigns,
						product_sku: productSku,
						total_revenue: common.roundPrice(product.total_revenue),
						order_count: product.order_count,
					});
				}
				else {
					if (product.product_title.includes("x")) {
						console.log(product.product_title)
					}
					if (common.hasNumberX(product.product_title)) {
						productSkus.get(productSku).sku_title = common.extractProductSku(product.product_title);
					}
					productSkus.get(productSku).total_revenue += common.roundPrice(product.total_revenue);
					productSkus.get(productSku).order_count += product.order_count;
					if (product.campaigns != undefined) {
						productSkus.get(productSku).campaigns.push(...product.campaigns);
					}
				}
			});
		}
		let processedProducts = Array.from(productSkus.values()).map(product => {
			product.ad_spend = 0;
			if (product.campaigns === undefined) {
				product.campaigns = [];
				product.orders = [];
			}
			// Find manual links for this product
			const productLinks = allProductCampaignLinks.filter(link => link.product_sku === product.product_sku);
			
			// Calculate total ad spend from linked campaigns
			productLinks.forEach(link => {
				const campaignSpend = adSpend.find(ad => ad.campaign_id === link.campaign_id);
				if (campaignSpend) {
					product.ad_spend += common.roundPrice(campaignSpend.total_spend);
					if (!product.campaigns.includes(link.campaign_id)) {
						product.campaigns.push(link.campaign_id);
					}
				}
			});
			product.profit = common.roundPrice(product.total_revenue - product.ad_spend);
			totalAdSpend += common.roundPrice(product.ad_spend);
			totalProfit += common.roundPrice(product.profit);
			product.roi_percentage = product.total_revenue > 0 ? (product.profit / common.roundPrice(product.total_revenue)) * 100 : 0;
			product.roi_percentage = common.roundPrice(product.roi_percentage);
			return product;
		});

		// Apply search filter
		if (search) {
			const searchLower = search.toLowerCase();
			processedProducts = processedProducts.filter(product => 
				product.product_title.toLowerCase().includes(searchLower)
			);
		}

		processedProducts.sort((a, b) => {
			let aValue = a[sortBy];
			let bValue = b[sortBy];
			
			// Handle null/undefined values
			if (aValue === null || aValue === undefined) aValue = 0;
			if (bValue === null || bValue === undefined) bValue = 0;
			
			// Handle string comparison
			if (typeof aValue === 'string') {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}
			
			if (sortOrder === 'asc') {
				return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
			} else {
				return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
			}
		});

		// Apply pagination
		const totalCount = processedProducts.length;
		const totalPages = Math.ceil(totalCount / limit);
		const offset = (page - 1) * limit;
		const paginatedProducts = processedProducts.slice(offset, offset + limit);

		return {
			products: paginatedProducts,
			totalRevenue: totalRevenue,
			totalProfit: totalProfit,
			totalAdSpend: totalAdSpend,
			pagination: {
				page,
				limit,
				totalCount,
				totalPages,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1
			}
		};
	}

	async calculateAdsOnlyAnalytics(date, storeId = 'buycosari') {
		try {
			// Get Google Ads spend
			const { data: adsData, error: adsError } = await supabase
				.from('ad_spend_detailed')
				.select('spend_amount, platform')
				.eq('date', date)
				.in('platform', ['google', 'facebook'])
				.eq('store_id', storeId);

			if (adsError) throw adsError;
			var googleAdsData = [], faceBookAdsData = [];
			adsData.forEach(ad => {
				if (ad.platform == 'google') {
					googleAdsData.push(ad);
				}
				else if (ad.platform == 'facebook') {
					faceBookAdsData.push(ad);
				}
			});
			let googleAdsSpend = googleAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);
			let facebookAdsSpend = faceBookAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);
			googleAdsSpend = common.roundPrice(googleAdsSpend);
			facebookAdsSpend = common.roundPrice(facebookAdsSpend);
			// Calculate total ad spend
			let totalAdSpend = googleAdsSpend + facebookAdsSpend;
			totalAdSpend = common.roundPrice(totalAdSpend);

			// Check if analytics record exists for this date and store
			const { data: existingAnalytics, error: checkError } = await supabase
				.from('analytics')
				.select('revenue, cost_of_goods')
				.eq('date', date)
				.eq('store_id', storeId)
				.single();

			if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
				console.error(`❌ Error checking existing analytics for ${date} (store: ${storeId}):`, checkError);
				throw checkError;
			}

			let revenue = 0;
			let existingCostOfGoods = 0;

			if (existingAnalytics) {
				// Use existing revenue and cost of goods
				revenue = parseFloat(existingAnalytics.revenue) || 0;
				existingCostOfGoods = parseFloat(existingAnalytics.cost_of_goods) || 0;
				revenue = common.roundPrice(revenue);
				existingCostOfGoods = common.roundPrice(existingCostOfGoods);
			}

			// Use the higher cost of goods value (existing or new)
			let profit = revenue - totalAdSpend - existingCostOfGoods;
			profit = common.roundPrice(profit);
			let profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
			profitMargin = common.roundPrice(profitMargin);

			// Upsert analytics data - only update ads-related fields, preserve revenue
			const analyticsData = {
				date,
				store_id: storeId,
				revenue: revenue, // Keep existing revenue
				google_ads_spend: googleAdsSpend,
				facebook_ads_spend: facebookAdsSpend,
				profit: profit,
				profit_margin: profitMargin
			};

			// Use upsert to update existing record or create new one
			try {
				const { error: upsertError } = await supabase
					.from('analytics')
					.upsert(analyticsData, { 
						onConflict: 'date,store_id',
						ignoreDuplicates: false 
					});

				if (upsertError) {
					console.error(`❌ Error upserting analytics for ${date} (store: ${storeId}):`, upsertError);
					throw upsertError;
				}

			} catch (error) {
				console.error(`❌ Error updating analytics for ${date} (store: ${storeId}):`, error);
				throw error;
			}

			return {
				date,
				revenue: revenue,
				googleAdsSpend,
				facebookAdsSpend,
				profit: profit,
				profitMargin: profitMargin
			};
		} catch (error) {
			console.error('Error calculating ads-only analytics:', error);
			throw error;
		}
	}

	async recalculateAdsOnlyAnalytics(socket = null, eventType = '', startDate = null, endDate = null, storeId = 'buycosari') {
		try {
			if (socket) {
				socket.emit(eventType, {
					stage: 'starting',
					message: `🔄 Starting ads-only analytics recalculation for store: ${storeId}...`,
					progress: 0,
					total: 0
				});
			}

			// First, get the count to see how much data we have
			let countQuery = supabase
				.from('ad_spend_detailed')
				.select('*', { count: 'exact', head: true })
				.eq('store_id', storeId);

			// Apply date range filter if provided
			if (startDate && endDate) {
				countQuery = countQuery.gte('date', startDate + "T00:00:00").lte('date', endDate + "T23:59:59.999");
			}

			const { count, error: countError } = await countQuery;
			if (countError) throw countError;

			if (socket) {
				socket.emit(eventType, {
					stage: 'fetching',
					message: `📊 Fetching ${count || 0} records for store: ${storeId}${startDate && endDate ? ` from ${startDate} to ${endDate}` : ''}...`,
					progress: 5,
					total: count || 0
				});
			}

			// Fetch all data in chunks of 1000 (Supabase limit)
			let allDates = [];
			const chunkSize = 1000;
			const totalChunks = Math.ceil((count || 0) / chunkSize);

			for (let i = 0; i < totalChunks; i++) {
				const offset = i * chunkSize;
				
				let query = supabase
					.from('ad_spend_detailed')
					.select('date')
					.eq('store_id', storeId)
					.range(offset, offset + chunkSize - 1)
					.order('date');

				// Apply date range filter if provided
				if (startDate && endDate) {
					query = query.gte('date', startDate + "T00:00:00").lte('date', endDate + "T23:59:59.999");
				}

				const { data: chunkData, error: chunkError } = await query;
				if (chunkError) throw chunkError;

				allDates.push(...(chunkData || []));
				if (socket) {
					const fetchProgress = 5 + Math.floor(((i + 1) / totalChunks) * 15); // Progress from 5% to 20%
					socket.emit(eventType, {
						stage: 'fetching',
						message: `📊 Fetched chunk ${i + 1}/${totalChunks} for store: ${storeId} (${offset + (chunkData?.length || 0)}/${count || 0} records)...`,
						progress: fetchProgress,
						total: count || 0,
						current: offset + (chunkData?.length || 0)
					});
				}
			}

			const uniqueDates = [...new Set(allDates.map(ad => ad.date))].sort();

			if (socket) {
				socket.emit(eventType, {
					stage: 'processing',
					message: `📊 Processing ${uniqueDates.length} unique dates for store: ${storeId}${uniqueDates.length > 0 ? ` (${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]})` : ''}...`,
					progress: 20,
					total: uniqueDates.length
				});
			}

			for (let i = 0; i < uniqueDates.length; i++) {
				const date = uniqueDates[i];

				if (socket) {
					const progress = 25 + Math.floor(((i + 1) / uniqueDates.length) * 75); // Progress from 20% to 95%
					socket.emit(eventType, {
						stage: 'calculating',
						message: `📊 Calculating analytics for ${date} (store: ${storeId}, ${i + 1}/${uniqueDates.length})...`,
						progress: progress,
						total: uniqueDates.length,
						current: i + 1
					});
				}

				await this.calculateAdsOnlyAnalytics(date, storeId);
			}

			if (socket) {
				const dateRangeInfo = uniqueDates.length > 0 ? ` (${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]})` : '';
				socket.emit(eventType, {
					stage: 'analytics_completed',
					message: `✅ Ads-only analytics recalculation completed successfully for store: ${storeId}!${dateRangeInfo}`,
					progress: 100,
					total: uniqueDates.length,
					processedDates: uniqueDates.length
				});
			}

		} catch (error) {
			console.error(`❌ Error recalculating ads-only analytics for store ${storeId}:`, error);

			if (socket) {
				socket.emit(eventType, {
					stage: 'error',
					message: `❌ Error recalculating ads-only analytics for store ${storeId}: ${error.message}`,
					progress: 0,
					total: 0,
					error: error.message
				});
			}

			throw error;
		}
	}

	// ========================================
	// PRODUCT TRENDS TABLE MANAGEMENT
	// ========================================

	async calculateAndStoreProductTrends(startDate, endDate, storeId = 'buycosari') {
		try {
			
			// Get all unique dates in the range
			const start = new Date(startDate);
			const end = new Date(endDate);
			const allDates = [];
			const currentDate = new Date(start);
			
			while (currentDate <= end) {
				allDates.push(currentDate.toISOString().split('T')[0]);
				currentDate.setDate(currentDate.getDate() + 1);
			}

			// Group dates by month
			const monthlyGroups = {};
			allDates.forEach(date => {
				const monthYear = date.substring(0, 7); // '2025-01'
				if (!monthlyGroups[monthYear]) {
					monthlyGroups[monthYear] = [];
				}
				monthlyGroups[monthYear].push(date);
			});

			// Process each month
			for (const [monthYear, dates] of Object.entries(monthlyGroups)) {
				const [year, month] = monthYear.split('-').map(Number);
				// Calculate monthly product analytics
				const monthlyData = await this.calculateMonthlyProductSkuAnalytics(
					dates[0], 
					dates[dates.length - 1], 
					storeId
				);

				// Store in product_trends table
				await this.storeMonthlyProductTrends(monthlyData, monthYear, month, year, storeId);
			}

			return { success: true, monthsProcessed: Object.keys(monthlyGroups).length };

		} catch (error) {
			console.error('❌ Error calculating and storing product trends:', error);
			throw error;
		}
	}

	async storeMonthlyProductTrends(monthlyData, monthYear, month, year, storeId) {
		try {
			// Prepare data for upsert
			const trendsData = monthlyData.map(item => ({
				store_id: storeId,
				product_sku: item.product_sku,
				month_year: monthYear,
				month: month,
				year: year,
				total_revenue: parseFloat(item.total_revenue) || 0,
				total_profit: parseFloat(item.total_revenue) || 0, // Will be updated with actual profit calculation
				order_count: parseInt(item.order_count) || 0,
				ad_spend: 0, // Will be updated separately
				cost_of_goods: 0 // Will be updated separately
			}));

			// Upsert to product_trends table
			const { error: upsertError } = await supabase
				.from('product_trends')
				.upsert(trendsData, { 
					onConflict: 'store_id,product_sku,month_year',
					ignoreDuplicates: false 
				});

			if (upsertError) {
				console.error(`❌ Error upserting product trends for ${monthYear}:`, upsertError);
				throw upsertError;
			}

		} catch (error) {
			console.error(`❌ Error storing monthly product trends for ${monthYear}:`, error);
			throw error;
		}
	}

	async recalculateAllProductTrends(socket = null, startDate = null, endDate = null, storeId = 'buycosari') {
		try {
			if (socket) {
				socket.emit('productTrendsProgress', {
					stage: 'starting',
					message: `🔄 Starting product trends recalculation for ${storeId}...`,
					progress: 0,
					total: 100
				});
			}

			// Step 1: Calculate and store basic trends (revenue, orders)
			if (socket) {
				socket.emit('productTrendsProgress', {
					stage: 'calculating_revenue',
					message: `📊 Calculating revenue trends...`,
					progress: 20,
					total: 100
				});
			}

			var startYear = startDate.split('-')[0];
			var startMonth = startDate.split('-')[1];
			var endYear = endDate.split('-')[0];
			var endMonth = endDate.split('-')[1];
			var uniqueDates = [];
			var products = [];

			var {count: productCount} = await supabase.from('products')
				.select('*', {count: 'exact', head: true}).eq('store_id', storeId);

			var chunk = 1000;
			for (var i = 0; i < productCount; i += chunk) {
				var {data: productsItems} = await supabase.from('products')
					.select('*').eq('store_id', storeId)
					.range(i, i + chunk - 1);
					products.push(...productsItems);
			}

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

			await supabase.from('product_trends').delete().eq('store_id', storeId).in('month_year', uniqueDates);

			var adsCampaignData = [];
			var {count: adCampaignCount} = await supabase.from('product_campaign_links')
				.select('*', {count: 'exact', head: true}).eq('store_id', storeId);
			
			for (var i = 0; i < adCampaignCount; i += chunk) {
				var adCampaignItems = await supabase.from('product_campaign_links')
					.select('*').eq('store_id', storeId)
					.range(i, i + chunk - 1);
				adsCampaignData.push(adCampaignItems.data);
			}

			for (const [index, date] of uniqueDates.entries()) {
				const lastDay = new Date(date.split('-')[0], date.split('-')[1], 0).getDate();
				var {count: orderCount} = await supabase.from('order_line_items')
					.select('*', {count: 'exact', head: true}).eq('store_id', storeId)
					.gte('created_at', `${date}-01T00:00:00`)
					.lte('created_at', `${date}-${lastDay}T23:59:59.999`)
					.neq('financial_status', 'refunded')
					.neq('financial_status', 'cancelled');

				var orderLineData = [], adsData = [], cogsData = [];

				for (var i = 0; i < orderCount; i += chunk) {
					var {data: orderLineItems} = await supabase.from('order_line_items')
						.select('*').eq('store_id', storeId)
						.gte('created_at', `${date}-01T00:00:00`)
						.lte('created_at', `${date}-${lastDay}T23:59:59.999`)
						.neq('financial_status', 'refunded')
						.neq('financial_status', 'cancelled')
						.range(i, i + chunk - 1);
					orderLineData.push(...orderLineItems);
				}

				var {count: adCount} = await supabase.from('ad_spend_details')
					.select('*', {count: 'exact', head: true}).eq('store_id', storeId)
					.gte('created_at', `${date}-01T00:00:00`)
					.lte('created_at', `${date}-${lastDay}T23:59:59.999`);

				for (var i = 0; i < adCount; i += chunk) {
					var adItems = await supabase.from('ad_spend_details')
						.select('*').eq('store_id', storeId)
						.gte('created_at', `${date}-01T00:00:00`)
						.lte('created_at', `${date}-${lastDay}T23:59:59.999`)
						.range(i, i + chunk - 1);
					adsData.push(...adItems.data);
				}

				var {count: cogsCount} = await supabase.from('cost_of_goods')
					.select('*', {count: 'exact', head: true}).eq('store_id', storeId)
					.gte('created_at', `${date}-01T00:00:00`)
					.lte('created_at', `${date}-${lastDay}T23:59:59.999`);

				for (var i = 0; i < cogsCount; i += chunk) {
					var cogsItems = await supabase.from('cost_of_goods')
						.select('*').eq('store_id', storeId)
						.gte('created_at', `${date}-01T00:00:00`)
						.lte('created_at', `${date}-${lastDay}T23:59:59.999`)
						.range(i, i + chunk - 1);
					cogsData.push(...cogsItems.data);
				}
				var monthlyProductTrends = [];
				orderLineData.forEach(orderLineItem => {
					var productSku = common.extractProductSku(orderLineItem.product_title);
					var productTrend = monthlyProductTrends.find(p => p.product_sku === productSku);
					if (productTrend) {
						productTrend.total_revenue += parseFloat(orderLineItem.total_price);
						productTrend.order_count++;
						productTrend.total_profit = productTrend.total_revenue - Math.random() * 1500;
					}
					else {
						monthlyProductTrends.push({
							product_sku: productSku,
							store_id: storeId,
							total_revenue: parseFloat(orderLineItem.total_price),
							order_count: 1,
							total_profit: parseFloat(orderLineItem.total_price),
							ad_spend: 0,
							month_year: date,
							month: parseInt(date.split('-')[1]),
							year: parseInt(date.split('-')[0]),
							cost_of_goods: 0,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						})
					}
				})

				cogsData.forEach(cogs => {
					var productSku = common.extractProductSku(cogs.product_title);
					var productTrend = monthlyProductTrends.find(p => p.product_sku === productSku);
					if (productTrend) {
						productTrend.cost_of_goods += parseFloat(cogs.total_cost);
						productTrend.total_profit -= productTrend.cost_of_goods;
					}
				})

				adsData.forEach(ad => {
					var adCampaigns = adsCampaignData.filter(a => a.campaign_id === ad.ad_campaign_id);
					adCampaigns.forEach(adCampaign => {
						var productSku = common.extractProductSku(adCampaign.product_title);
						var productTrend = monthlyProductTrends.find(p => p.product_sku === productSku);
						if (productTrend) {
							productTrend.ad_spend += parseFloat(ad.spend_amount || 0);
							productTrend.total_profit -= productTrend.ad_spend;
						}
					})
				});

				for (var i = 0; i < monthlyProductTrends.length; i += chunk) {
					const {insertError} = await supabase.from('product_trends').insert(monthlyProductTrends.slice(i, i + chunk));
					if (insertError) {
						console.error('❌ Error inserting product trends:', insertError);
						throw insertError;
					}
				}
				
				if (socket) {
					socket.emit('productTrendsProgress', {
						stage: 'updating_ads_cogs',
						message: `💰 Updating with ads and COGS data...`,
						progress: (index + 1) / uniqueDates.length * 100,
						total: 100
					});
				}
			}

			// Step 2: Update with ads and COGS data
			if (socket) {
				socket.emit('productTrendsProgress', {
					stage: 'completed',
					message: `✅ Product trends recalculation completed for ${storeId}!`,
					progress: 100,
					total: 100
				});
			}

			return { success: true, message: 'Product trends recalculated successfully' };

		} catch (error) {
			console.error('❌ Error in full product trends recalculation:', error);
			
			if (socket) {
				socket.emit('productTrendsProgress', {
					stage: 'error',
					message: `❌ Error recalculating product trends: ${error.message}`,
					progress: 0,
					total: 100,
					error: error.message
				});
			}

			throw error;
		}
	}

	// Product Cohort Analytics - Track individual product performance over time since first appearance
	async calculateProductCohortAnalytics(startDate, endDate, options = {}) {
		const {
			storeId = 'buycosari',
			metric = 'revenue', // 'revenue', 'orders', 'profit'
			timeframe = 'month' // 'month', 'quarter'
		} = options;


		// Use the retryOperation helper for database resilience
		return retryOperation(async () => {
			try {
				// First, get all products and their first appearance dates
				const { data: productFirstDates, error: firstDateError } = await supabase
					.from('product_trends')
					.select('product_sku, month_year, total_revenue, order_count, total_profit, month, year')
					.eq('store_id', storeId)
					.gte('month_year', `${startDate}`)
					.lte('month_year', `${endDate}`)
					.order('month_year', { ascending: true });

				if (firstDateError) throw firstDateError;

				if (!productFirstDates || productFirstDates.length === 0) {
					return {
						success: true,
						data: [],
						products: [],
						message: 'No product trends data found for cohort analysis'
					};
				}

				// Find first appearance for each product
				const productFirstAppearance = {};
				productFirstDates.forEach(trend => {
					const sku = trend.product_sku;
					const monthYear = trend.month_year;
					
					if (!productFirstAppearance[sku] || monthYear < productFirstAppearance[sku]) {
						productFirstAppearance[sku] = monthYear;
					}
				});

				// Get unique products
				const uniqueProducts = Object.keys(productFirstAppearance);

				// Calculate individual product performance month-over-month
				const individualProductData = [];
				
				uniqueProducts.forEach(sku => {
					const firstAppearance = productFirstAppearance[sku];
					const firstAppearanceDate = new Date(firstAppearance + '-01');
					
					// Calculate the number of months in the selected date range
					const start = new Date(startDate + '-01');
					const end = new Date(endDate + '-01');
					const monthDifference = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
					
					// Initialize product data structure with dynamic months
					const productData = {
						productSku: sku,
						firstAppearance: firstAppearance,
						firstAppearanceDisplay: formatMonthYear(firstAppearance),
						totalValue: 0,
						growthRate: 0,
						cac: 0, // Customer Acquisition Cost
						retentionRate: 0 // Retention Rate (%)
					};
					
					// Dynamically add month properties based on selected range
					for (let i = 0; i < monthDifference; i++) {
						productData[`month${i}`] = 0;
					}

					productFirstDates.forEach(trend => {
						if (trend.product_sku === sku) {
							const trendDate = new Date(trend.month_year + '-01');
							
							// Calculate months since the start of selected range
							const monthsFromStart = (trendDate.getFullYear() - start.getFullYear()) * 12 + 
								(trendDate.getMonth() - start.getMonth());
							
							// Get the metric value
							let metricValue = 0;
							switch (metric) {
								case 'revenue':
									metricValue = parseFloat(trend.total_revenue) || 0;
									break;
								case 'orders':
									metricValue = parseInt(trend.order_count) || 0;
									break;
								case 'profit':
									metricValue = parseFloat(trend.total_profit) || 0;
									break;
								default:
									metricValue = parseFloat(trend.total_revenue) || 0;
							}

							// Set the month value if within the selected range
							if (monthsFromStart >= 0 && monthsFromStart < monthDifference) {
								productData[`month${monthsFromStart}`] = metricValue;
							}
						}
					});

					// Calculate total value dynamically
					productData.totalValue = 0;
					for (let i = 0; i < monthDifference; i++) {
						productData.totalValue += productData[`month${i}`] || 0;
					}
					
					// Calculate growth rate if we have data
					if (productData.month0 > 0) {
						const lastMonthIndex = monthDifference - 1;
						const lastMonthValue = productData[`month${lastMonthIndex}`] || 0;
						productData.growthRate = ((lastMonthValue - productData.month0) / productData.month0) * 100;
					}

					if (metric === 'revenue' && productData.month0 > 0) {
						productData.cac = 0; // Will be calculated when ad spend data is available
					}

					let retentionMonths = 0;
					let totalMonths = 0;
					
					// Iterate through available months (excluding month0 which is the first month)
					for (let i = 1; i < monthDifference && i <= 12; i++) {
						const monthKey = `month${i}`;
						if (productData[monthKey] > 0) {
							totalMonths++;
							// If performance is maintained or improved compared to previous month
							const prevMonthKey = `month${i-1}`;
							if (productData[monthKey] >= productData[prevMonthKey] * 0.8) { // 80% threshold
								retentionMonths++;
							}
						}
					}
					
					productData.retentionRate = totalMonths > 0 ? (retentionMonths / totalMonths) * 100 : 0;

					individualProductData.push(productData);
				});

				// Sort products by total value (descending)
				individualProductData.sort((a, b) => b.totalValue - a.totalValue);

				// Calculate summary statistics
				const summaryStats = {
					totalProducts: individualProductData.length,
					averageFirstMonth: individualProductData.reduce((sum, p) => sum + p.month0, 0) / individualProductData.length,
					averageTotalValue: individualProductData.reduce((sum, p) => sum + p.totalValue, 0) / individualProductData.length,
					topPerformer: individualProductData[0]?.productSku || 'N/A',
					topPerformerValue: individualProductData[0]?.totalValue || 0
				};

				return {
					success: true,
					data: individualProductData,
					products: individualProductData,
					summary: summaryStats,
					metric: metric,
					timeframe: timeframe,
					message: `Successfully retrieved individual product analytics for ${individualProductData.length} products`
				};
				
			} catch (error) {
				console.error('❌ Error in individual product cohort analytics:', error);
				throw error;
			}
		}, 3, 1000); // Retry up to 3 times with 1 second delay
	}

	// Helper function to format month-year
	formatMonthYear(monthYear) {
		const [year, month] = monthYear.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
	}
}

// Helper function to format month-year (standalone version)
function formatMonthYear(monthYear) {
	const [year, month] = monthYear.split('-');
	const date = new Date(parseInt(year), parseInt(month) - 1);
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

module.exports = new AnalyticsService(); 