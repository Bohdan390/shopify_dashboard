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
	// Helper function to send WebSocket messages
	sendWebSocketMessage(socket, eventType, data) {
		if (socket && socket.readyState === 1) { // WebSocket.OPEN
			const message = JSON.stringify({
				type: eventType,
				data: data,
				timestamp: Date.now()
			});
			socket.send(message);
		}
	}
	async calculateDailyAnalytics(date, storeId = 'buycosari') {
		try {
			// Get revenue for the date
			const { count: ordersCount, error: ordersCountError } = await supabase
				.from('orders')
				.select('*', { count: 'exact' })
				.eq('store_id', storeId)
				.gte('created_at', `${date}T00:00:00`)
				.lt('created_at', `${date}T23:59:59.999`);

			if (ordersCountError) throw ordersCountError;

			const { data: customerCount, error: customerError } = await supabase.rpc('get_customer_count', {
				store_id: storeId,
				start_date: date + 'T00:00:00',
				end_date: date + 'T23:59:59.999'
			});

			if (customerError) throw customerError;

			var chunk = 1000;

			let revenueData = [];
			for (var i = 0; i < ordersCount; i += chunk) {
				const { data: ordersData, error: revenueError } = await supabase
					.from('orders')
					.select('total_price, financial_status')
					.eq('store_id', storeId)
					.gte('created_at', `${date}T00:00:00`)
					.lt('created_at', `${date}T23:59:59.999`)
					.range(i, i + chunk - 1);

				if (revenueError) throw revenueError;
				ordersData.forEach(order => {
					if (order.financial_status === 'paid') {
						revenueData.push({
							total_price: order.total_price,
						});
					}
				});
			}

			const revenue = revenueData.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

			// Get Google Ads spend
			const { count: adSpendCount, error: adSpendError } = await supabase.from("ad_spend_detailed")
				.select("*", { count: "exact" }).eq("store_id", storeId).eq("date", date);
			if (adSpendError) throw adSpendError;
			var chunk = 1000, googleAdsSpend = 0, facebookAdsSpend = 0, taboolaAdsSpend = 0;
			for (var i = 0; i < adSpendCount; i += chunk) {
				const { data: adSpendChunk, error: adSpendError } = await supabase.from("ad_spend_detailed")
					.select("*").eq("store_id", storeId).eq("date", date).range(i, i + chunk - 1);
				adSpendChunk.forEach(ad => {
					if (ad.platform === "google") {
						googleAdsSpend += parseFloat(ad.spend_amount);
					} else if (ad.platform === "facebook") {
						facebookAdsSpend += parseFloat(ad.spend_amount);
					} else if (ad.platform === "taboola") {
						taboolaAdsSpend += parseFloat(ad.spend_amount);
					}
				});
			}
			// Get cost of goods
			const { data: cogData, error: cogError } = await supabase
				.from('cost_of_goods')
				.select('total_cost')
				.eq('date', date)
				.eq('store_id', storeId);

			if (cogError) throw cogError;
			const costOfGoods = cogData.reduce((sum, cog) => sum + parseFloat(cog.total_cost), 0);

			// Calculate profit
			const totalAdSpend = googleAdsSpend + facebookAdsSpend + taboolaAdsSpend;
			const profit = revenue - totalAdSpend - costOfGoods;
			const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

			if (date == '2025-09-03') {
				console.log(revenue, googleAdsSpend, facebookAdsSpend, taboolaAdsSpend, costOfGoods, profit)
			}
			// Upsert analytics data
			const analyticsData = {
				date,
				store_id: storeId,
				orders_count: ordersCount,
				customers_count: customerCount.customer_count,
				revenue: common.roundPrice(revenue),
				google_ads_spend: common.roundPrice(googleAdsSpend),
				facebook_ads_spend: common.roundPrice(facebookAdsSpend),
				taboola_ads_spend: common.roundPrice(taboolaAdsSpend),
				cost_of_goods: common.roundPrice(costOfGoods),
				profit: common.roundPrice(profit),
				profit_margin: common.roundPrice(profitMargin)
			};

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
				ordersCount,
				customerCount,
				revenue,
				googleAdsSpend,
				facebookAdsSpend,
				taboolaAdsSpend,
				costOfGoods,
				profit,
				profitMargin
			};
		} catch (error) {
			console.error('Error calculating daily analytics:', error);
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

	// Filter analytics data by country-specific campaigns
	async filterAnalyticsByCountry(analyticsData, startDate, endDate, storeId, countryName, countryCode) {
		try {
			// Get country-specific campaigns
			const { count: campaignCount, error: campaignCountError } = await supabase.from("ad_campaigns")
				.select("*", { count: "exact" }).eq("store_id", storeId).or(`country_code.eq.${countryCode},country_code.is.null`).eq("status", "active");
			if (campaignCountError) {
				console.error('❌ Error fetching country campaigns:', campaignCountError);
				return analyticsData; // Return original data if error
			}

			var chunk = 1000;
			var campaignIds = [];
			var d = new Date()
			for (var i = 0; i < campaignCount; i += chunk) {
				const { data: campaignsChunk, error: campaignsError } = await supabase
					.from('ad_campaigns')
					.select('campaign_id')
					.eq('store_id', storeId)
					.or(`country_code.eq.${countryCode},country_code.is.null`)
					.eq('status', 'active')
					.range(i, i + chunk - 1);

				if (campaignsError) {
					console.error('❌ Error fetching country campaigns:', campaignsError);
					return analyticsData; // Return original data if error
				}
				campaignIds.push(...campaignsChunk.map(c => c.campaign_id));
			}

			// Get country-specific ad spend data
			const { count: adSpendCount, error: adSpendCountError } = await supabase.from("ad_spend_detailed")
				.select("*", { count: "exact" }).in('campaign_id', campaignIds)
				.eq('store_id', storeId).gte('date', startDate).lte('date', endDate);
			if (adSpendCountError) {
				console.error('❌ Error fetching country ad spend count:', adSpendCountError);
				return analyticsData; // Return original data if error
			}


			var adSpendData = [];
			for (var i = 0; i < adSpendCount; i += chunk) {
				const { data: adSpendDataChunk, error: adSpendDataError } = await supabase.from("ad_spend_detailed")
					.select("date, platform, spend_amount, currency").in('campaign_id', campaignIds).eq('store_id', storeId)
					.gte('date', startDate).lte('date', endDate).range(i, i + chunk - 1);
				if (adSpendDataError) {
					console.error('❌ Error fetching country ad spend data:', adSpendDataError);
					return analyticsData; // Return original data if error
				}
				adSpendData.push(...adSpendDataChunk);
			}

			var { data: ordersByDateCountry, error: ordersByDateCountryError } = await supabase.rpc("get_orders_total_price_by_date_country", {
				p_store_id: storeId,
				start_date: startDate,
				end_date: endDate,
				p_country_name: countryName
			});

			var totalOrdersPrice = 0, paidOrdersPrice = 0, totalOrdersCount = 0, paidOrdersCount = 0;
			ordersByDateCountry.forEach((order) => {
				totalOrdersPrice += parseFloat(order.total_price);
				paidOrdersPrice += parseFloat(order.paid_orders_price);
				paidOrdersCount += order.paid_orders_count;
				totalOrdersCount += order.total_orders_count;
			})

			if (ordersByDateCountryError) {
				console.error('❌ Error fetching country orders:', ordersByDateCountryError);
				return analyticsData; // Return original data if error
			}

			const { count: customerCount, error: customerCountError } = await supabase.from("customers").select("*", { count: "exact" }).eq("store_id", storeId).eq("order_country", countryName);
			if (customerCountError) {
				console.error('❌ Error fetching country customers:', customerCountError);
				return analyticsData; // Return original data if error
			}

			const countryAdSpendByDate = {};
			adSpendData.forEach(spend => {
				const date = spend.date;
				if (!countryAdSpendByDate[date]) {
					countryAdSpendByDate[date] = { google: 0, facebook: 0, taboola: 0 };
				}
				if (spend.platform === 'google') {
					countryAdSpendByDate[date].google += parseFloat(spend.spend_amount);
				} else if (spend.platform === 'facebook') {
					countryAdSpendByDate[date].facebook += parseFloat(spend.spend_amount);
				}
				else if (spend.platform === 'taboola') {
					countryAdSpendByDate[date].taboola += parseFloat(spend.spend_amount);
				}
			});

			const countryRevenueByDate = {};
			ordersByDateCountry.forEach(order => {
				const date = order.date;
				countryRevenueByDate[date] = (countryRevenueByDate[date] || 0) + parseFloat(order.paid_orders_price);
			});

			var { data: costOfGoods } = await supabase.from("country_costs")
				.select("*").eq("store_id", storeId).gte("date", startDate).lte("date", endDate)
				.eq("country", countryName);
			var costOfGoodsByDate = {};
			costOfGoods.forEach(cost => {
				const date = cost.date;
				costOfGoodsByDate[date] = (costOfGoodsByDate[date] || 0) + parseFloat(cost.total_cost);
			});


			// Update analytics data with country-specific values
			var analytics = analyticsData.map(day => {
				const countryAdSpend = countryAdSpendByDate[day.date] || { google: 0, facebook: 0, taboola: 0 };
				const countryRevenue = countryRevenueByDate[day.date] || 0;
				const countryCostOfGoods = costOfGoodsByDate[day.date] || 0;
				return {
					...day,
					taboola_ads_spend: countryAdSpend.taboola,
					customers_count: customerCount,
					google_ads_spend: countryAdSpend.google,
					facebook_ads_spend: countryAdSpend.facebook,
					revenue: countryRevenue,
					profit: countryRevenue - countryCostOfGoods - countryAdSpend.google - countryAdSpend.facebook - countryAdSpend.taboola,
					profit_margin: countryRevenue > 0 ? (countryRevenue - countryCostOfGoods - countryAdSpend.google - countryAdSpend.facebook - countryAdSpend.taboola) / countryRevenue * 100 : 0,
					cost_of_goods: countryCostOfGoods
				};
			});

			return {
				analytics, summaryData: {
					totalOrders: totalOrdersCount,
					paidOrders: paidOrdersCount,
					totalRevenue: paidOrdersPrice,
					paidRevenue: paidOrdersPrice,
					avgOrderValue: paidOrdersPrice / totalOrdersCount,
				}
			}

		} catch (error) {
			console.error('❌ Error filtering analytics by country:', error);
			return analyticsData; // Return original data if error
		}
	}

	async getSummaryStats(startDate, endDate, storeId = 'buycosari', country = null) {
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
						.select('*')
						.eq('store_id', storeId)
						.gte('date', `${startDate}T00:00:00`)
						.lte('date', `${endDate}T23:59:59.999`)
						.range(offset, offset + chunkSize - 1);

					if (analyticsError) {
						console.error('❌ Error fetching analytics data:', analyticsError);
						throw analyticsError;
					}

					if (analyticsChunk && analyticsChunk.length > 0) {
						allAnalyticsData.push(...analyticsChunk);
						offset += chunkSize;
					} else {
						hasMoreData = false;
					}
				}

				var data = {}
				var countryName = ""
				if (country && country !== 'all') {
					const { data: countryCodes } = await supabase.from("countries").select("country_code, country_name").eq("country_code", country).limit(1);
					if (countryCodes.length > 0) {
						countryName = countryCodes[0].country_name;
					}
					var { analytics, summaryData } = await this.filterAnalyticsByCountry(allAnalyticsData, startDate, endDate, storeId, countryName, country);
					allAnalyticsData = analytics;
					data = summaryData;
				}

				const completeData = this.generateCompleteDateRange(startDate, endDate, allAnalyticsData);
				// Get total order count (no chunking needed for count)
				if (countryName == '') {
					const stats = await supabase.rpc('get_orders_price_stats', {
						p_store_id: storeId,
						p_start_date: startDate + 'T00:00:00',
						p_end_date: endDate + 'T23:59:59.999',
					});

					if (stats.error) {
						console.error('❌ Error fetching orders stats:', stats.error);
						throw stats.error;
					}

					data = {
						totalOrders: stats.data[0].total_orders_count,
						paidOrders: stats.data[0].paid_orders_count,
						totalRevenue: stats.data[0].paid_orders_price,
						paidRevenue: stats.data[0].paid_orders_price,
						avgOrderValue: stats.data[0].total_orders_price / stats.data[0].total_orders_count,
					}
				}

				const summary = allAnalyticsData.reduce((acc, row) => {
					acc.totalGoogleAds += parseFloat(row.google_ads_spend || 0);
					acc.totalFacebookAds += parseFloat(row.facebook_ads_spend || 0);
					acc.totalTaboolaAds += parseFloat(row.taboola_ads_spend || 0);
					acc.totalCostOfGoods += parseFloat(row.cost_of_goods || 0);
					acc.totalProfit += parseFloat(row.profit || 0);
					return acc;
				}, {
					totalRevenue: 0,
					totalGoogleAds: 0,
					totalFacebookAds: 0,
					totalTaboolaAds: 0,
					totalCostOfGoods: 0,
					totalProfit: 0,
					totalOrders: data.totalOrders || 0,
					paidOrders: data.paidOrders || 0
				});

				summary.totalRevenue = data.totalRevenue;
				summary.averageProfitMargin = summary.totalRevenue > 0
					? (summary.totalProfit / summary.totalRevenue) * 100
					: 0;

				return { summary, analytics: completeData };
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


	async recalculateAnalyticsFromDate(syncDate, socket = null, isStandaloneRecalc = false, storeId = 'buycosari') {
		try {
			if (socket) {
				const eventType = isStandaloneRecalc ? 'recalcProgress' : 'syncProgress';
				const initialProgress = isStandaloneRecalc ? 0 : 95;

				this.sendWebSocketMessage(socket, eventType, {
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
					this.sendWebSocketMessage(socket, 'recalcProgress', {
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
			let currentDate = common.createLocalDate(minDateData[0].created_at);
			let endDate = common.createLocalDate(maxDateData[0].created_at);
			endDate = endDate.setDate(endDate.getDate() + 1)

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

					this.sendWebSocketMessage(socket, eventType, {
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

				this.sendWebSocketMessage(socket, eventType, {
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

				this.sendWebSocketMessage(socket, eventType, {
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
				const { data: productTrends, error: productTrendsError } = await supabase
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
			console.log(1)
			let initialProgress = 0;
			if (socket) {
				initialProgress = 0;
				this.sendWebSocketMessage(socket, socketStatus, {
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
				.eq('financial_status', 'paid')
				.eq('store_id', storeId)
				.gte('saved_at', `${syncDate}T00:00:00`)
				.order('created_at', { ascending: true })
				.limit(1);

			if (minDateError) throw minDateError;

			const { data: maxDateData, error: maxDateError } = await supabase
				.from('orders')
				.select('created_at')
				.eq('financial_status', 'paid')
				.eq('store_id', storeId)
				.gte('saved_at', `${syncDate}T00:00:00`)
				.order('created_at', { ascending: false })
				.limit(1);

			if (maxDateError) throw maxDateError;
			console.log(minDateData, maxDateData, syncDate)

			if (!minDateData || minDateData.length === 0 || !maxDateData || maxDateData.length === 0) {
				if (socket) {
					this.sendWebSocketMessage(socket, socketStatus, {
						stage: 'completed',
						message: '📭 No orders found from sync date, skipping revenue calculation',
						progress: 100,
						total: 0
					});
				}
				console.log(2.2)
				return;
			}

			// Generate all dates in the range
			const allDates = [];
			let currentDate = common.createLocalDate(minDateData[0].created_at);
			let endDate = common.createLocalDate(maxDateData[0].created_at);
			endDate = endDate.setDate(endDate.getDate() + 1)

			while (currentDate <= endDate) {
				allDates.push(currentDate.toISOString().split('T')[0]);
				currentDate.setDate(currentDate.getDate() + 1);
			}
			console.log(3)
			// Process each date - ORDERS ONLY (no ads, no COGS)
			let processedCount = 0;
			for (const date of allDates) {
				try {
					// Calculate revenue for this date ONLY
					const { count: ordersCount, error: ordersCountError } = await supabase
						.from('orders')
						.select('*', { count: 'exact' })
						.eq('store_id', storeId)
						.gte('created_at', `${date}T00:00:00`)
						.lt('created_at', `${date}T23:59:59.999`);

					if (ordersCountError) throw ordersCountError;

					const { data: customerCount, error: customerError } = await supabase.rpc('get_customer_count', {
						store_id: storeId,
						start_date: date + 'T00:00:00',
						end_date: date + 'T23:59:59.999'
					});

					var chunk = 1000;

					let revenueData = [];
					for (var i = 0; i < ordersCount; i += chunk) {
						const { data: ordersData, error: revenueError } = await supabase
							.from('orders')
							.select('total_price, financial_status')
							.eq('store_id', storeId)
							.gte('created_at', `${date}T00:00:00`)
							.lt('created_at', `${date}T23:59:59.999`)
							.range(i, i + chunk - 1);

						if (revenueError) throw revenueError;
						ordersData.forEach(order => {
							if (order.financial_status === 'paid') {
								revenueData.push({
									total_price: order.total_price,
								});
							}
						});
					}

					let revenue = revenueData.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

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
						orders_count: ordersCount,
						customers_count: customerCount.customer_count,
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
						this.sendWebSocketMessage(socket, socketStatus, {
							stage: 'processing',
							message: `📊 Processing revenue for ${date}... (${processedCount}/${allDates.length})`,
							progress: Number(progress.toFixed(0)) > 100 ? 100 : Number(progress.toFixed(0)),
							total: allDates.length,
							current: processedCount
						});
					}

				} catch (dateError) {
					console.error(`❌ Error processing orders for ${date}:`, dateError);
					// Continue with next date instead of failing completely
				}
			}
			console.log(4)

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'completed',
					message: `✅ Revenue recalculation completed! Processed ${processedCount} days`,
					progress: 100,
					total: allDates.length,
					current: processedCount
				});
			}

			console.log(123)
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
				this.sendWebSocketMessage(socket, socketStatus, {
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
		const { count: campaignCount } = await supabase
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

		let productData = [];
		if (storeId == "meonutrition") {
			let { data: pData, error: productDataError } = await supabase
				.from('products')
				.select('*')
				.eq("store_id", storeId)
			productData.push(...pData);
		}
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
				product.sku_title.toLowerCase().includes(searchLower)
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

		productData.forEach(product => {
			if (common.hasNumberXPattern(product.product_title)) {
				if (paginatedProducts.find(p => product.product_sku_id.includes(p.product_sku))) {
					paginatedProducts.find(p => product.product_sku_id.includes(p.product_sku)).sku_title = common.extractProductSku(product.product_title);
				}
			}
		});


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
				.select('spend_amount, platform, currency')
				.eq('date', date)
				.in('platform', ['google', 'facebook', 'taboola'])
				.eq('store_id', storeId);

			if (adsError) throw adsError;
			var googleAdsData = [], faceBookAdsData = [], taboolaAdsData = [];
			adsData.forEach(ad => {
				if (ad.platform == 'google') {
					googleAdsData.push(ad);
				}
				else if (ad.platform == 'facebook') {
					faceBookAdsData.push(ad);
				}
				else if (ad.platform == 'taboola') {
					taboolaAdsData.push(ad);
				}
			});
			let googleAdsSpend = googleAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);
			let facebookAdsSpend = faceBookAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);
			let taboolaAdsSpend = taboolaAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);
			googleAdsSpend = common.roundPrice(googleAdsSpend);
			facebookAdsSpend = common.roundPrice(facebookAdsSpend);
			taboolaAdsSpend = common.roundPrice(taboolaAdsSpend);
			// Calculate total ad spend
			let totalAdSpend = googleAdsSpend + facebookAdsSpend + taboolaAdsSpend;
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
				taboola_ads_spend: taboolaAdsSpend,
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
				taboolaAdsSpend,
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
				this.sendWebSocketMessage(socket, eventType, {
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
				this.sendWebSocketMessage(socket, eventType, {
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
					this.sendWebSocketMessage(socket, eventType, {
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
				this.sendWebSocketMessage(socket, eventType, {
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
					this.sendWebSocketMessage(socket, eventType, {
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
				this.sendWebSocketMessage(socket, eventType, {
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
				this.sendWebSocketMessage(socket, eventType, {
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

	async calculateMonthlyProductTrends(productTrends, startDate, endDate, storeId = 'buycosari') {
		try {


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

			productTrends.forEach(productTrend => {
				for (var key in productTrend) {
					var productIds = productTrend.product_ids.split(",");
					var customersCount = 0;
					if (key.includes("revenue") || key.includes("profit")) {
						for (var index = 0; index < allCustomers.length; index++) {
							var customer = allCustomers[index];
							if (!customer.first_order_product_ids || !customer.first_order_date || customer.first_order_date.substring(0, 7) != key.substring(0, 7)) {
								continue;
							}
							var ids = customer.first_order_product_ids.split(",")
							var f = 0;
							for (var i = 0; i < ids.length; i++) {
								if (productIds.find(id => id == ids[i])) {
									f += 1;
								}
							}
							if (f > 0) {
								customersCount += 1;
							}
						}
						if (customersCount == 0) productTrend[key] = 0;
						else productTrend[key] = common.roundPrice(productTrend[key] / customersCount) || 0;
					}
				}
			})

			return productTrends;

		} catch (error) {
			console.error(`❌ Error calculating monthly product trends for ${startDate} to ${endDate}:`, error);
			throw error;
		}
	}

	async recalculateAllProductTrends(sockets, startDate = null, endDate = null, storeId = 'buycosari') {
		try {

			var chunkSize = 1000;

			// Emit initial progress
			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProductProgress', {
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

			console.log(-1)
			var dd = new Date();
			const { data: skuData, error: skuError } = await supabase.from("product_skus").select("sku_id, sku_title, product_ids").eq("store_id", storeId);
			if (skuError) throw skuError;

			var allProductSkus = new Map();
			skuData.forEach(sku => {
				if (allProductSkus.has(sku.sku_id)) {
					allProductSkus.get(sku.sku_id).push(sku);
				}
				else {
					allProductSkus.set(sku.sku_id, { ...sku });
				}
			});

			var startEndDate = common.getLastDayOfMonthISO(startDate.split('-')[0], startDate.split('-')[1]);
			const { count: customerCount } = await supabase.from('customers')
				.select('*', { count: 'exact', head: true })
				.eq('store_id', storeId)
				.gte('first_order_date', `${startDate}-01T00:00:00Z`)
				.lte('first_order_date', `${startEndDate}T23:59:59Z`);
			var allCustomers = [];
			if (customerCount > 0) {
				for (var i = 0; i < customerCount; i += chunkSize) {
					const { data: customers, error: customersError } = await supabase.from('customers')
						.select('first_order_date, first_order_product_ids, customer_id')
						.eq('store_id', storeId)
						.gte('first_order_date', `${startDate}-01T00:00:00Z`)
						.lte('first_order_date', `${startEndDate}T23:59:59Z`)
						.order('first_order_date', { ascending: true })
						.range(i, i + chunkSize - 1);
					if (customersError) throw customersError;
					allCustomers.push(...customers);
				}
			}

			endDate = common.getLastDayOfMonthISO(endDate.split('-')[0], endDate.split('-')[1]);
			const { count: rangeOrderCount, error: rangeOrderCountError } = await supabase
				.from('order_line_items')
				.select('*', { count: 'exact', head: true })
				.eq('store_id', storeId)
				.eq('financial_status', 'paid')
				.gte('created_at', `${startDate}-01T00:00:00Z`)
				.lte('created_at', `${endDate}T23:59:59Z`);

			if (rangeOrderCountError) throw rangeOrderCountError;

			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProductProgress', {
						stage: 'calculating',
						message: '',
						progress: 5,
						total: 'unlimited'
					});
				})
			}

			var rangeOrders = [];
			console.log(startDate, 'startDate', endDate)
			for (var i = 0; i < rangeOrderCount; i += chunkSize) {
				const { data: orders, error: rangeOrdersError } = await supabase.from("order_line_items")
					.select('customer_id, total_price, created_at, sku')
					.eq('financial_status', 'paid')
					.eq('store_id', storeId)
					.gte('created_at', `${startDate}-01T00:00:00Z`)
					.lte('created_at', `${endDate}T23:59:59Z`)
					.order('created_at', { ascending: true })
					.range(i, i + chunkSize - 1);
				if (rangeOrdersError) throw rangeOrdersError;
				rangeOrders.push(...orders);
				if (sockets.length > 0) {
					sockets.forEach(socket => {
						sendWebSocketMessage(socket, 'syncProductProgress', {
							stage: 'calculating',
							message: '📥 Fetching customers data...',
							progress: Number((5 + (i / rangeOrderCount) * 45).toFixed(0)),
							total: 'unlimited'
						});
					})
				}
			}
			console.log(1, rangeOrders.length)

			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProductProgress', {
						stage: 'calculating',
						message: '📥 Fetching product campaign links data...',
						progress: 50,
						total: 'unlimited'
					});
				})
			}

			console.log(customerCount)
			const { count: adsProductCampaignCount } = await supabase
				.from('product_campaign_links')
				.select('*', { count: 'exact', head: true })
				.eq('store_id', storeId)
				.eq('is_active', true)

			var allProductCampaignLinks = [];
			for (var i = 0; i < adsProductCampaignCount; i += chunkSize) {
				const { data: productCampaignLinks, error: productCampaignLinksError } = await supabase.from('product_campaign_links')
					.select('*')
					.eq('store_id', storeId)
					.eq('is_active', true)
					.range(i, i + chunkSize - 1);
				if (productCampaignLinksError) throw productCampaignLinksError;
				allProductCampaignLinks.push(...productCampaignLinks);
				if (sockets.length > 0) {
					sockets.forEach(socket => {
						sendWebSocketMessage(socket, 'syncProductProgress', {
							stage: 'calculating',
							message: '📥 Fetching products data...',
							progress: Number((50 + (i / adsProductCampaignCount) * 10).toFixed(0)),
							total: 'unlimited'
						});
					})
				}
			}
			console.log(2)

			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProductProgress', {
						stage: 'calculating',
						message: '📥 Fetching products data...',
						progress: 60,
						total: 'unlimited'
					});
				})
			}

			const { count: costOfGoodsCount } = await supabase.from("cost_of_goods").select("*", { count: 'exact', head: true }).eq("store_id", storeId);
			var allCostOfGoods = [];
			for (var i = 0; i < costOfGoodsCount; i += chunkSize) {
				const { data: costOfGoods, error: costOfGoodsError } = await supabase.from("cost_of_goods").select("*").eq("store_id", storeId).range(i, i + chunkSize - 1);
				if (costOfGoodsError) throw costOfGoodsError;
				allCostOfGoods.push(...costOfGoods);
			}

			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, 'syncProductProgress', {
						stage: 'calculating',
						message: '� Calculating LTV cohorts...',
						progress: 70,
						total: 'unlimited'
					});
				})
			}
			console.log(3)

			var adsIds = allProductCampaignLinks.map(productCampaignLink => productCampaignLink.campaign_id);

			var allAdsSpend = [];
			if (adsIds.length > 0) {
				const { count: adsSpendCount } = await supabase.from('ad_spend_detailed').select('*', { count: 'exact', head: true }).eq('store_id', storeId).in('campaign_id', adsIds);
				if (adsSpendCount > 0) {
					for (var i = 0; i < adsSpendCount; i += chunkSize) {
						const { data: adsSpend, error: adsSpendError } = await supabase.from('ad_spend_detailed')
							.select('campaign_id, spend_amount, date, currency')
							.eq('store_id', storeId)
							.in('campaign_id', adsIds)
							.range(i, i + chunkSize - 1);
						if (adsSpendError) throw adsSpendError;
						allAdsSpend.push(...adsSpend);
						if (sockets.length > 0) {
							sockets.forEach((socket) => {
								sendWebSocketMessage(socket, 'syncProductProgress', {
									stage: 'calculating',
									message: '� Calculating LTV cohorts...',
									progress: Number((70 + (i / adsSpendCount) * 20).toFixed(0)),
									total: 'unlimited'
								});
							})
						}
					}
				}
			}

			allProductCampaignLinks.forEach(productCampaignLink => {
				allAdsSpend.forEach(ad => {
					if (ad.campaign_id === productCampaignLink.campaign_id) {
						var product = allProductSkus.get(productCampaignLink.product_sku);
						if (product) {
							if (product[ad.date.substring(0, 7) + '_adSpend']) {
								product[ad.date.substring(0, 7) + '_adSpend'] += ad.spend_amount;
							}
							else {
								product[ad.date.substring(0, 7) + '_adSpend'] = ad.spend_amount;
							}
						}
					}
				})
			})

			allCostOfGoods.forEach(cogs => {
				var ss = cogs.product_sku_id;
				if (ss.includes("-")) {
					ss = ss.split("-")[0] + "-" + ss.split("-")[1];
				}
				var product = allProductSkus.get(ss);
				if (product) {
					if (product[cogs.date.substring(0, 7) + '_cogs']) {
						product[cogs.date.substring(0, 7) + '_cogs'] += cogs.total_cost;
					}
					else {
						product[cogs.date.substring(0, 7) + "_cogs"] = cogs.total_cost;
					}
				}
			})
			console.log(4)

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
			if (sockets.length > 0) {
				sockets.forEach((socket) => {
					sendWebSocketMessage(socket, 'syncProductProgress', {
						stage: 'calculating',
						message: '� Calculating LTV cohorts...',
						progress: 90,
						total: 'unlimited'
					});
				})
			}
			var date = new Date()
			// rangeOrders = rangeOrders.filter(order => customerIds.find(id => id == order.customer_id) != undefined)
			console.log(22, rangeOrders.length)
			Array.from(allProductSkus.values()).forEach(product => {
				var totalPrice = 0, profitPrice = 0;
				product['total_price'] = 0
				for (var i = 0; i < uniqueDates.length; i++) {
					var date = uniqueDates[i];
					var customers = allCustomers.filter(customer => product.product_ids.split(",").some(id => customer.first_order_product_ids != null && customer.first_order_product_ids.includes(id)));
					var customerIds = customers.map(customer => customer.customer_id)
					var orderLineItems = rangeOrders.filter(orderLineItem => orderLineItem.created_at.includes(date) && customerIds.includes(orderLineItem.customer_id) && orderLineItem.sku != null && orderLineItem.sku.includes(product.sku_id));
					orderLineItems.forEach(orderLineItem => {
						totalPrice += parseFloat(orderLineItem.total_price);
					})
					profitPrice = totalPrice - (product[date + '_cogs'] || 0) - (product[date + '_adSpend'] || 0);
					product[date + '_revenue'] = common.roundPrice(totalPrice) / customers.length;
					product[date + '_profit'] = common.roundPrice(profitPrice) / customers.length;
					product['total_price'] += totalPrice;
				}
				if (sockets.length > 0) {
					sockets.forEach((socket) => {
						sendWebSocketMessage(socket, 'syncProductProgress', {
							stage: 'calculating',
							message: '� Calculating LTV cohorts...',
							progress: Number((90 + (i / Array.from(allProductSkus.values()).length) * 10).toFixed(0)),
							total: 'unlimited'
						});
					})
				}
			})
			Array.from(allProductSkus.values()).forEach(product => {
				for (var key in product) {
					if (key.includes("_cogs") || key.includes("_adSpend")) {
						delete product[key];
					}
				}
			})
			if (sockets.length > 0) {
				sockets.forEach((socket) => {
					sendWebSocketMessage(socket, 'syncProductProgress', {
						stage: 'calculating',
						message: '� Calculating LTV cohorts...',
						progress: 100,
						total: 'unlimited'
					});
				})
			}
			var productTrends = Array.from(allProductSkus.values())
			productTrends.sort((a, b) => b['total_price'] - a['total_price'])
			console.log(new Date().getTime() - date.getTime())
			// Step 2: Update with ads and COGS data
			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, "syncProductProgress", {
						stage: 'get_product_ltv_cohorts',
						message: `✅ Product trends recalculation completed for ${storeId}!`,
						data: JSON.stringify(productTrends)
					});
				})
			}

			return { success: true, message: 'Product trends recalculated successfully' };

		} catch (error) {
			console.error('❌ Error in full product trends recalculation:', error);

			if (sockets.length > 0) {
				sockets.forEach(socket => {
					sendWebSocketMessage(socket, "syncProductProgress", {
						stage: 'error',
						message: `❌ Error recalculating product trends: ${error.message}`,
						progress: 0,
						total: 100,
						error: error.message
					});
				})
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
							const prevMonthKey = `month${i - 1}`;
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

module.exports = new AnalyticsService(); 