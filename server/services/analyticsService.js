const { supabase, insert, update, select } = require('../config/database-supabase');

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

			console.log(`🔄 Retrying in ${delay}ms... (${attempt}/${maxRetries})`);
			await new Promise(resolve => setTimeout(resolve, delay));
			delay *= 2; // Exponential backoff
		}
	}
};

class AnalyticsService {
	async calculateDailyAnalytics(date) {
		try {
			console.log(`  📊 Calculating analytics for ${date}...`);

			// Get revenue for the date
			const { data: revenueData, error: revenueError } = await supabase
				.from('orders')
				.select('total_price')
				.eq('financial_status', 'paid')
				.gte('created_at', `${date}T00:00:00`)
				.lt('created_at', `${date}T23:59:59.999`);

			if (revenueError) throw revenueError;
			const revenue = revenueData.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

			console.log(`    💰 Found ${revenueData.length} paid orders with revenue $${revenue}`);

			// Get Google Ads spend
			const { data: googleAdsData, error: googleAdsError } = await supabase
				.from('ad_spend_detailed')
				.select('spend_amount')
				.eq('date', date)
				.eq('platform', 'google');

			if (googleAdsError) throw googleAdsError;
			const googleAdsSpend = googleAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);

			// Get Facebook Ads spend
			const { data: facebookAdsData, error: facebookAdsError } = await supabase
				.from('ad_spend_detailed')
				.select('spend_amount')
				.eq('date', date)
				.eq('platform', 'facebook');

			if (facebookAdsError) throw facebookAdsError;
			const facebookAdsSpend = facebookAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);

			// Get cost of goods
			const { data: cogData, error: cogError } = await supabase
				.from('cost_of_goods')
				.select('total_cost')
				.eq('date', date);

			if (cogError) throw cogError;
			const costOfGoods = cogData.reduce((sum, cog) => sum + parseFloat(cog.total_cost), 0);

			// Calculate profit
			const totalAdSpend = googleAdsSpend + facebookAdsSpend;
			const profit = revenue - totalAdSpend - costOfGoods;
			const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

			// Upsert analytics data
			const analyticsData = {
				date,
				revenue,
				google_ads_spend: googleAdsSpend,
				facebook_ads_spend: facebookAdsSpend,
				cost_of_goods: costOfGoods,
				profit,
				profit_margin: profitMargin
			};

			// Delete existing record for this date first, then insert new one
			try {
				// Delete existing analytics for this date
				const { error: deleteError } = await supabase
					.from('analytics')
					.delete()
					.eq('date', date);

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

				console.log(`✅ Analytics updated for ${date}`);
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

	async getAnalyticsRange(startDate, endDate) {
		try {
			console.log(`📊 Fetching analytics range: ${startDate} to ${endDate}`);

			return await retryOperation(async () => {

				const { data, error } = await supabase
					.from('analytics')
					.select('*')
					.gte('date', `${startDate}T00:00:00`)
					.lte('date', `${endDate}T23:59:59.999`)
					.order('date');

				if (error) {
					console.error('❌ Error fetching analytics data:', error);
					throw error;
				}

				console.log(`📊 Found ${data.length} analytics records in database`);

				// Generate complete date range with $0 values for missing days
				const completeData = this.generateCompleteDateRange(startDate, endDate, data);

				console.log(`📊 Generated ${completeData.length} complete date entries (including missing days)`);

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
	createLocalDate(dateString) {
		var date = new Date(dateString)
		var year = date.getFullYear()
		var month = date.getMonth()
		var day = date.getDate()
		const offsetMinutes = new Date().getTimezoneOffset(); // in minutes
		const offsetHours = -offsetMinutes / 60;
		return new Date(year, month, day, offsetHours); // month is 0-indexed
	}

	generateCompleteDateRange(startDate, endDate, existingData) {
		// Parse dates as local dates to avoid timezone issues
		const start = this.createLocalDate(startDate);
		const end = this.createLocalDate(endDate);
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

	async getSummaryStats(startDate, endDate) {
		try {
			console.log(`🔍 Getting summary stats for ${startDate} to ${endDate}`);

			return await retryOperation(async () => {
				// Get analytics data
				const { data: analyticsData, error: analyticsError } = await supabase
					.from('analytics')
					.select('revenue, google_ads_spend, facebook_ads_spend, cost_of_goods, profit')
					.gte('date', `${startDate}T00:00:00`)
					.lte('date', `${endDate}T23:59:59.999`);

				if (analyticsError) {
					console.error('❌ Error fetching analytics data:', analyticsError);
					throw analyticsError;
				}

				// Get order counts for the date range
				const { count: totalOrders, error: ordersError } = await supabase
					.from('orders')
					.select('*', { count: 'exact', head: true })
					.gte('created_at', `${startDate}T00:00:00`)
					.lte('created_at', `${endDate}T23:59:59.999`);

				if (ordersError) {
					console.error('❌ Error fetching orders count:', ordersError);
					throw ordersError;
				}

				// Get paid orders count for the date range
				const { count: paidOrders, error: paidOrdersError } = await supabase
					.from('orders')
					.select('*', { count: 'exact', head: true })
					.eq('financial_status', 'paid')
					.gte('created_at', `${startDate}T00:00:00`)
					.lte('created_at', `${endDate}T23:59:59.999`);

				if (paidOrdersError) {
					console.error('❌ Error fetching paid orders count:', paidOrdersError);
					throw paidOrdersError;
				}

				console.log(`📊 Found ${analyticsData.length} analytics records, ${totalOrders} total orders, ${paidOrders} paid orders`);

				const summary = analyticsData.reduce((acc, row) => {
					acc.totalRevenue += parseFloat(row.revenue || 0);
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
					totalOrders: totalOrders || 0,
					paidOrders: paidOrders || 0
				});

				summary.averageProfitMargin = summary.totalRevenue > 0
					? (summary.totalProfit / summary.totalRevenue) * 100
					: 0;

				console.log('✅ Summary stats calculated successfully');
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
			console.log('🔄 Recalculating all analytics...');

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
				console.log(`🔄 Calculating analytics for ${date}... (${i + 1}/${uniqueDates.length})`);

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

			console.log('✅ Analytics recalculation completed');
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

	async recalculateAnalyticsFromDate(syncDate, socket = null, isStandaloneRecalc = false) {
		try {
			console.log(`🔄 Recalculating analytics from ${syncDate} onwards...`);
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
				.gte('created_at', `${syncDate}T00:00:00`)
				.order('created_at', { ascending: true })
				.limit(1);

			if (minDateError) throw minDateError;

			// Get max date from paid orders from syncDate onwards
			const { data: maxDateData, error: maxDateError } = await supabase
				.from('orders')
				.select('created_at')
				.eq('financial_status', 'paid')
				.gte('created_at', `${syncDate}T00:00:00`)
				.order('created_at', { ascending: false })
				.limit(1);

			if (maxDateError) throw maxDateError;

			if (!minDateData || minDateData.length === 0 || !maxDateData || maxDateData.length === 0) {
				console.log('📭 No orders found from sync date, skipping analytics recalculation');
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
			const currentDate = this.createLocalDate(minDateData[0].created_at);
			const endDate = this.createLocalDate(maxDateData[0].created_at);


			while (currentDate <= endDate) {
				allDates.push(currentDate.toISOString().split('T')[0]);
				currentDate.setDate(currentDate.getDate() + 1);
			}

			for (let i = 0; i < allDates.length; i++) {
				const date = allDates[i];
				console.log(`🔄 Calculating analytics for ${date}... (${i + 1}/${allDates.length})`);

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

				await this.calculateDailyAnalytics(date);
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

			console.log('✅ Analytics recalculation from sync date completed');
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

	async deleteAnalyticsFromDate(syncDate) {
		try {
			console.log(`🗑️  Deleting analytics from ${syncDate} onwards...`);

			const { error } = await supabase
				.from('analytics')
				.delete()
				.gte('date', syncDate);

			if (error) {
				console.error('❌ Error deleting analytics:', error);
				throw error;
			}

			console.log(`🗑️  Deleted analytics from ${syncDate} onwards`);
		} catch (error) {
			console.error('❌ Error deleting analytics from date:', error);
			throw error;
		}
	}

	// Store Analytics - Group by store field from campaigns
	async calculateStoreAnalytics(startDate, endDate) {
		
	}

	// Product Analytics - Match campaigns to products based on order line items
	async calculateProductAnalytics(startDate, endDate, options = {}) {
		console.log(startDate + 'T00:00:00', endDate + 'T23:59:59.999')
		
		const {
			sortBy = 'total_revenue',
			sortOrder = 'desc',
			search = '',
			minRevenue = null,
			maxRevenue = null,
			minProfit = null,
			maxProfit = null,
			minROI = null,
			maxROI = null,
			page = 1,
			limit = 50
		} = options;

		const { data: productRevenue, error: productRevenueError } = await supabase
		.rpc('aggregate_product_revenue', {
			start_date: startDate + 'T00:00:00',
			end_date: endDate + 'T23:59:59.999'
		});

		if (productRevenueError) throw productRevenueError;

		const { data: adSpend, error: adSpendError } = await supabase
		.rpc('aggregate_ad_spend_by_campaign', {
			start_date: startDate + 'T00:00:00',
			end_date: endDate + 'T23:59:59.999'
		});

		if (adSpendError) throw adSpendError;

		// Process and enrich product data
		// Get manual product-campaign links
		const { data: manualLinks, error: linksError } = await supabase
			.from('product_campaign_links')
			.select('*')
			.eq('is_active', true);

		if (linksError) throw linksError;

		let processedProducts = productRevenue.map(product => {
			product.ad_spend = 0;
			if (product.campaigns === undefined) {
				product.campaigns = [];
				product.orders = [];
			}

			// Find manual links for this product
			const productLinks = manualLinks.filter(link => link.product_id === product.product_title);
			
			// Calculate total ad spend from linked campaigns
			productLinks.forEach(link => {
				const campaignSpend = adSpend.find(ad => ad.campaign_id === link.campaign_id);
				if (campaignSpend) {
					product.ad_spend += campaignSpend.total_spend;
					if (!product.campaigns.includes(link.campaign_id)) {
						product.campaigns.push(link.campaign_id);
					}
				}
			});

			product.profit = product.total_revenue - product.ad_spend;
			product.roi_percentage = product.total_revenue > 0 ? (product.profit / product.total_revenue) * 100 : 0;
			return product;
		});

		// Apply search filter
		if (search) {
			const searchLower = search.toLowerCase();
			processedProducts = processedProducts.filter(product => 
				product.product_title.toLowerCase().includes(searchLower)
			);
		}

		// Apply range filters
		if (minRevenue !== null) {
			processedProducts = processedProducts.filter(product => product.total_revenue >= minRevenue);
		}
		if (maxRevenue !== null) {
			processedProducts = processedProducts.filter(product => product.total_revenue <= maxRevenue);
		}
		if (minProfit !== null) {
			processedProducts = processedProducts.filter(product => product.profit >= minProfit);
		}
		if (maxProfit !== null) {
			processedProducts = processedProducts.filter(product => product.profit <= maxProfit);
		}
		if (minROI !== null) {
			processedProducts = processedProducts.filter(product => product.roi_percentage >= minROI);
		}
		if (maxROI !== null) {
			processedProducts = processedProducts.filter(product => product.roi_percentage <= maxROI);
		}

		// Apply sorting
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

	async calculateAdsOnlyAnalytics(date) {
		try {
			console.log(`  📊 Calculating ads-only analytics for ${date}...`);

			// Get Google Ads spend
			const { data: googleAdsData, error: googleAdsError } = await supabase
				.from('ad_spend_detailed')
				.select('spend_amount')
				.eq('date', date)
				.eq('platform', 'google');

			if (googleAdsError) throw googleAdsError;
			const googleAdsSpend = googleAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);

			// Get Facebook Ads spend
			const { data: facebookAdsData, error: facebookAdsError } = await supabase
				.from('ad_spend_detailed')
				.select('spend_amount')
				.eq('date', date)
				.eq('platform', 'facebook');

			if (facebookAdsError) throw facebookAdsError;
			const facebookAdsSpend = facebookAdsData.reduce((sum, ad) => sum + parseFloat(ad.spend_amount), 0);

			// Get cost of goods
			const { data: cogData, error: cogError } = await supabase
				.from('cost_of_goods')
				.select('total_cost')
				.eq('date', date);

			if (cogError) throw cogError;
			const costOfGoods = cogData.reduce((sum, cog) => sum + parseFloat(cog.total_cost), 0);

			// Calculate total ad spend
			const totalAdSpend = googleAdsSpend + facebookAdsSpend;

			console.log(`    💰 Found Google Ads spend: $${googleAdsSpend}, Facebook Ads spend: $${facebookAdsSpend}, Total: $${totalAdSpend}`);

			// Check if analytics record exists for this date
			const { data: existingAnalytics, error: checkError } = await supabase
				.from('analytics')
				.select('revenue, cost_of_goods')
				.eq('date', date)
				.single();

			if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
				console.error(`❌ Error checking existing analytics for ${date}:`, checkError);
				throw checkError;
			}

			let revenue = 0;
			let existingCostOfGoods = 0;

			if (existingAnalytics) {
				// Use existing revenue and cost of goods
				revenue = parseFloat(existingAnalytics.revenue) || 0;
				existingCostOfGoods = parseFloat(existingAnalytics.cost_of_goods) || 0;
				console.log(`    📊 Found existing analytics: revenue $${revenue}, cost of goods $${existingCostOfGoods}`);
			}

			// Use the higher cost of goods value (existing or new)
			const finalCostOfGoods = Math.max(existingCostOfGoods, costOfGoods);

			// Calculate profit with existing revenue and new ads data
			const profit = revenue - totalAdSpend - finalCostOfGoods;
			const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

			// Upsert analytics data - only update ads-related fields, preserve revenue
			const analyticsData = {
				date,
				revenue: revenue, // Keep existing revenue
				google_ads_spend: googleAdsSpend,
				facebook_ads_spend: facebookAdsSpend,
				cost_of_goods: finalCostOfGoods,
				profit: profit,
				profit_margin: profitMargin
			};

			// Use upsert to update existing record or create new one
			try {
				const { error: upsertError } = await supabase
					.from('analytics')
					.upsert(analyticsData, { 
						onConflict: 'date',
						ignoreDuplicates: false 
					});

				if (upsertError) {
					console.error(`❌ Error upserting analytics for ${date}:`, upsertError);
					throw upsertError;
				}

				console.log(`✅ Ads analytics updated for ${date} (revenue: $${revenue}, profit: $${profit})`);
			} catch (error) {
				console.error(`❌ Error updating analytics for ${date}:`, error);
				throw error;
			}

			return {
				date,
				revenue: revenue,
				googleAdsSpend,
				facebookAdsSpend,
				costOfGoods: finalCostOfGoods,
				profit: profit,
				profitMargin: profitMargin
			};
		} catch (error) {
			console.error('Error calculating ads-only analytics:', error);
			throw error;
		}
	}

	async recalculateAdsOnlyAnalytics(socket = null, eventType = 'recalcProgress', startDate = null, endDate = null) {
		try {
			console.log('🔄 Recalculating ads-only analytics...');
			if (startDate && endDate) {
				console.log(`📅 Date range: ${startDate} to ${endDate}`);
			}

			if (socket) {
				socket.emit(eventType, {
					stage: 'starting',
					message: '🔄 Starting ads-only analytics recalculation...',
					progress: 0,
					total: 0
				});
			}

			// First, get the count to see how much data we have
			let countQuery = supabase
				.from('ad_spend_detailed')
				.select('*', { count: 'exact', head: true });

			// Apply date range filter if provided
			if (startDate && endDate) {
				countQuery = countQuery.gte('date', startDate + "T00:00:00").lte('date', endDate + "T23:59:59.999");
			}

			const { count, error: countError } = await countQuery;
			if (countError) throw countError;

			console.log(`📊 Total records to process: ${count || 0}`);

			if (socket) {
				socket.emit(eventType, {
					stage: 'fetching',
					message: `📊 Fetching ${count || 0} records${startDate && endDate ? ` from ${startDate} to ${endDate}` : ''}...`,
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
					.range(offset, offset + chunkSize - 1)
					.order('date');

				// Apply date range filter if provided
				if (startDate && endDate) {
					query = query.gte('date', startDate + "T00:00:00").lte('date', endDate + "T23:59:59.999");
				}

				const { data: chunkData, error: chunkError } = await query;
				if (chunkError) throw chunkError;

				allDates.push(...(chunkData || []));
				console.log(`📊 Fetched chunk ${i + 1}/${totalChunks}: ${chunkData?.length || 0} records`);

				if (socket) {
					const fetchProgress = 5 + Math.floor(((i + 1) / totalChunks) * 15); // Progress from 5% to 20%
					socket.emit(eventType, {
						stage: 'fetching',
						message: `📊 Fetched chunk ${i + 1}/${totalChunks} (${offset + (chunkData?.length || 0)}/${count || 0} records)...`,
						progress: fetchProgress,
						total: count || 0,
						current: offset + (chunkData?.length || 0)
					});
				}
			}

			const uniqueDates = [...new Set(allDates.map(ad => ad.date))].sort();

			console.log(`📊 Unique dates found: ${uniqueDates.length}`);
			if (uniqueDates.length > 0) {
				console.log(`📊 Date range: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
			}

			if (socket) {
				socket.emit(eventType, {
					stage: 'processing',
					message: `📊 Processing ${uniqueDates.length} unique dates${uniqueDates.length > 0 ? ` (${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]})` : ''}...`,
					progress: 20,
					total: uniqueDates.length
				});
			}

			for (let i = 0; i < uniqueDates.length; i++) {
				const date = uniqueDates[i];
				console.log(`🔄 Calculating ads-only analytics for ${date}... (${i + 1}/${uniqueDates.length})`);

				if (socket) {
					const progress = 25 + Math.floor(((i + 1) / uniqueDates.length) * 75); // Progress from 20% to 95%
					socket.emit(eventType, {
						stage: 'calculating',
						message: `📊 Calculating analytics for ${date} (${i + 1}/${uniqueDates.length})...`,
						progress: progress,
						total: uniqueDates.length,
						current: i + 1
					});
				}

				await this.calculateAdsOnlyAnalytics(date);
			}

			if (socket) {
				const dateRangeInfo = uniqueDates.length > 0 ? ` (${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]})` : '';
				socket.emit(eventType, {
					stage: 'analytics_completed',
					message: `✅ Ads-only analytics recalculation completed successfully!${dateRangeInfo}`,
					progress: 100,
					total: uniqueDates.length,
					processedDates: uniqueDates.length
				});
			}

			console.log('✅ Ads-only analytics recalculation completed');
		} catch (error) {
			console.error('❌ Error recalculating ads-only analytics:', error);

			if (socket) {
				socket.emit(eventType, {
					stage: 'error',
					message: `❌ Error recalculating ads-only analytics: ${error.message}`,
					progress: 0,
					total: 0,
					error: error.message
				});
			}

			throw error;
		}
	}
}

module.exports = new AnalyticsService(); 