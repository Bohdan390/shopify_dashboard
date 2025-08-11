const axios = require('axios');
const { supabase, insert, update, select } = require('../config/database-supabase');
const analyticsService = require('./analyticsService');

class ShopifyService {
	constructor(storeId = 'buycosari') {
		this.storeId = storeId;
		this.setupStoreConfig();
	}

	setupStoreConfig() {
		// Store configurations
		const storeConfigs = {
			buycosari: {
				shopUrl: 'buycosari.com',
				accessToken: process.env.COSARI_ACCESS_TOKEN,
				apiVersion: process.env.SHOPIFY_API_VERSION || '2024-04'
			},
			meonutrition: {
				shopUrl: 'meonutrition.com',
				accessToken: process.env.MEONUTRITION_ACCESS_TOKEN,
				apiVersion: process.env.SHOPIFY_API_VERSION || '2024-04'
			},
			nomobark: {
				shopUrl: 'nomobark.com',
				accessToken: process.env.NOMOBARK_ACCESS_TOKEN,
				apiVersion: process.env.SHOPIFY_API_VERSION || '2024-04'
			},
			dermao: {
				shopUrl: 'dermao.com',
				accessToken: process.env.DERMAO_ACCESS_TOKEN,
				apiVersion: process.env.SHOPIFY_API_VERSION || '2024-04'
			},
			gamoseries: {
				shopUrl: 'gamoseries.com',
				accessToken: process.env.GAMOSERIES_ACCESS_TOKEN,
				apiVersion: process.env.SHOPIFY_API_VERSION || '2024-04'
			},
			cosara: {
				shopUrl: 'cosara.com',
				accessToken: process.env.COSARA_ACCESS_TOKEN,
				apiVersion: process.env.SHOPIFY_API_VERSION || '2024-04'
			}
		};

		const config = storeConfigs[this.storeId];
		if (!config) {
			throw new Error(`Store configuration not found for: ${this.storeId}`);
		}

		this.baseURL = `https://${config.shopUrl}/admin/api/${config.apiVersion}`;
		this.headers = {
			'X-Shopify-Access-Token': config.accessToken,
			'Content-Type': 'application/json'
		};

		console.log(`🏪 Initialized Shopify service for store: ${this.storeId}`);
		console.log(`🔗 Base URL: ${this.baseURL}`);
	}

	async fetchOrders(limit = 50, since_id = null, syncDate = null, socket = null) {
		try {
			let allOrders = [], orders = [];
			let totalFetched = 0;
			let pageCount = 0;

			if (syncDate) {
				console.log('Sync date provided:', syncDate);
			}

			var nextPage = false, pageInfo = "";
			while (true) {
				pageCount++;
				let url = `${this.baseURL}/orders.json?limit=${limit}&status=any`;

				if (nextPage && pageInfo) {
					// Don't double-encode the page_info - it's already properly encoded
					url = `${this.baseURL}/orders.json?limit=${limit}&page_info=${pageInfo}`;
					console.log("Using pagination URL:", url);
				} else if (syncDate) {
					url += `&updated_at_min=${syncDate}`;
				}

				// Emit progress update for each page
				if (socket) {
					const progress = Math.min(10 + (pageCount * 2), 20); // Progress from 10% to 20%
					socket.emit('syncProgress', {
						stage: 'fetching',
						message: `📥 Fetching page ${pageCount}... (${totalFetched} orders so far)`,
						progress: progress,
						total: 'unlimited',
						current: totalFetched
					});
				}

				const response = await axios.get(url, { headers: this.headers });
				orders = response.data.orders;

				const linkHeader = response.headers['link'];

				if (linkHeader && linkHeader.includes('rel="next"')) {
					const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
					const nextUrl = match ? match[1] : null;

					// Extract page_info from the nextUrl
					const urlObj = new URL(nextUrl);
					pageInfo = urlObj.searchParams.get('page_info');

					console.log("Next page_info:", pageInfo);
					nextPage = true;
				} else {
					nextPage = false;
				}

				allOrders = allOrders.concat(orders);
				totalFetched += orders.length;

				console.log(allOrders[0])
				console.log(`📦 Fetched ${orders.length} orders (total: ${totalFetched})`);

				// No max orders limit - fetch all available orders

				// If we got fewer orders than the limit, we've reached the end
				if (orders.length < limit) {
					console.log('📭 Reached end of orders');
					break;
				}

				if (!nextPage) {
					console.log('📭 No more pages to fetch');
					break;
				}

				// Add a small delay to avoid rate limiting
				await new Promise(resolve => setTimeout(resolve, 100));
			}

			console.log(`✅ Total orders fetched: ${allOrders.length}`);

			return allOrders;
		} catch (error) {
			console.error('❌ Error fetching orders:', error.message);
			if (error.response) {
				console.error('Response status:', error.response.status);
				console.error('Response data:', error.response.data);
				console.error('Request URL:', error.config?.url);
			}
			throw error;
		}
	}

	async saveOrdersToDatabase(orders, socket = null) {
		try {
			console.log(`🔄 Preparing to save ${orders.length} orders to database using upsert...`);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'saving',
					message: `💾 Preparing to save ${orders.length} orders using upsert...`,
					progress: 25,
					total: orders.length,
					current: 0
				});
			}

			// Transform all orders to database format
			const orderDataArray = [];
			const uniqueCustomers = new Map();
			
			var {count: customerCount} = await supabase
				.from('customers')
				.select('*', {count: 'exact', head: true})
				.eq('store_id', this.storeId);
			
			var chunk = 1000;
			var allCustomers = [];
			for (var i = 0; i < customerCount; i+= chunk) {
				const currentChunk = Math.floor(i / chunk) + 1;

				const { data: customers, error: customersError } = await supabase
					.from('customers')
					.select('*')
					.eq('store_id', this.storeId)
					.range(i, i + chunk - 1);

				if (customersError) {
					console.error(`❌ Error in customers upsert chunk ${currentChunk}:`, customersError);
					throw customersError;
				}
				allCustomers.push(...customers);
			}

			orders.forEach((order) => {
				orderDataArray.push({
					shopify_order_id: order.id.toString(),
					store_id: this.storeId, // Add store ID
					order_number: order.order_number,
					total_price: parseFloat(order.total_price),
					subtotal_price: parseFloat(order.subtotal_price),
					total_tax: parseFloat(order.total_tax),
					total_discounts: parseFloat(order.total_discounts),
					currency: order.currency,
					financial_status: order.financial_status,
					fulfillment_status: order.fulfillment_status,
					created_at: new Date(order.created_at).toISOString(),
					updated_at: new Date(order.updated_at).toISOString(),
					customer_email: order.customer?.email || null,
					customer_id: order.customer?.id?.toString() || null
				})
				
				// Extract customer data if customer exists
				if (order.customer && order.customer.id) {
					const customerId = order.customer.id.toString();
					if (!uniqueCustomers.has(customerId)) {
						// Get default address from customer
						const defaultAddress = order.customer.default_address || {};
						var customer = allCustomers.find(customer => customer.customer_id === customerId);
						uniqueCustomers.set(customerId, {
							customer_id: customerId,
							store_id: this.storeId,
							email: order.customer.email || null,
							first_name: order.customer.first_name || null,
							last_name: order.customer.last_name || null,
							phone: order.customer.phone || null,
							orders_count: order.customer.orders_count || 0,
							total_spent: parseFloat(order.customer.total_spent || 0),
							// Address fields
							address1: defaultAddress.address1 || null,
							address2: defaultAddress.address2 || null,
							city: defaultAddress.city || null,
							province: defaultAddress.province || null,
							country: defaultAddress.country || null,
							zip: defaultAddress.zip || null,
							created_at: new Date(order.customer.created_at || order.created_at).toISOString(),
							updated_at: new Date(order.customer.updated_at || order.updated_at).toISOString(),
							// Track first order date - will be updated during upsert
							first_order_date: customer ? new Date(customer.first_order_date).toISOString() : new Date(order.created_at).toISOString(),
							first_order_price: customer ? parseFloat(customer.first_order_price) : parseFloat(order.total_price)
						});
					}
					else {
						if (uniqueCustomers.get(customerId).first_order_date > order.created_at) {
							uniqueCustomers.get(customerId).first_order_date = new Date(order.created_at).toISOString();
							uniqueCustomers.get(customerId).first_order_price = parseFloat(order.total_price);
						}
					}
				}
			})
			
			// Extract unique products from line items and prepare for products table
			const uniqueProducts = new Map();
			const lineItemsData = [];
			
			orders.forEach(order => {
				if (order.line_items && order.line_items.length > 0) {
					order.line_items.forEach(lineItem => {
						// Skip line items without product_id
						if (!lineItem.product_id) {
							console.log(`⚠️  Skipping line item without product_id: ${lineItem.id}`);
							return;
						}
						const productId = lineItem.product_id.toString();
						
						// Add to unique products map
						if (!uniqueProducts.has(productId)) {
							uniqueProducts.set(productId, {
								product_id: productId,
								store_id: this.storeId, // Add store ID
								product_title: lineItem.title || 'Unknown Product',
								product_type: lineItem.product_type || null,
								vendor: lineItem.vendor || null,
								status: 'active',
								created_at: new Date().toISOString(),
								updated_at: new Date().toISOString()
							});
						}

						// Prepare line item data
						lineItemsData.push({
							shopify_order_id: order.id.toString(),
							store_id: this.storeId, // Add store ID
							financial_status: order.financial_status,
							line_item_id: lineItem.id.toString(),
							product_id: productId,
							product_title: lineItem.title || 'Unknown Product',
							variant_id: lineItem.variant_id?.toString() || null,
							variant_title: lineItem.variant_title || null,
							sku: lineItem.sku || null,
							quantity: lineItem.quantity || 1,
							price: parseFloat(lineItem.price || 0),
							total_price: parseFloat(lineItem.price || 0) * (lineItem.quantity || 1),
							created_at: new Date(order.created_at).toISOString()
						});
					});
				}
			});
			const startTime = Date.now();

			// Save unique products to products table using upsert
			if (uniqueProducts.size > 0) {
				console.log(`📦 Saving ${uniqueProducts.size} unique products to products table using upsert...`);
				
				const productsArray = Array.from(uniqueProducts.values());
				
				// Upsert products in chunks
				const BATCH_SIZE = 1000;
				let totalProductsSaved = 0;

				if (productsArray.length > BATCH_SIZE) {
					const totalChunks = Math.ceil(productsArray.length / BATCH_SIZE);

					for (let i = 0; i < productsArray.length; i += BATCH_SIZE) {
						const chunk = productsArray.slice(i, i + BATCH_SIZE);
						const currentChunk = Math.floor(i / BATCH_SIZE) + 1;
						console.log(`🔄 Processing products chunk ${currentChunk}/${totalChunks} (${chunk.length} products)...`);

						const { error: productsError } = await supabase
							.from('products')
							.upsert(chunk, { 
								onConflict: 'product_id',
								ignoreDuplicates: false 
							});

						if (productsError) {
							console.error(`❌ Error in products upsert chunk ${currentChunk}:`, productsError);
							throw productsError;
						}

						totalProductsSaved += chunk.length;
						console.log(`✅ Products chunk ${currentChunk} completed. Total saved: ${totalProductsSaved}/${productsArray.length}`);
					}
				} else {
					const { error: productsError } = await supabase
						.from('products')
						.upsert(productsArray, { 
							onConflict: 'product_id',
							ignoreDuplicates: false 
						});

					if (productsError) {
						console.error('❌ Error saving products:', productsError);
						throw productsError;
					}

					totalProductsSaved = productsArray.length;
				}

				console.log(`✅ Successfully saved ${totalProductsSaved} products to products table using upsert`);
			}

			// Save unique customers to customers table using upsert
			const BATCH_SIZE = 1000;
			if (uniqueCustomers.size > 0) {
				console.log(`👥 Saving ${uniqueCustomers.size} unique customers to customers table using upsert...`);
				
				const customersArray = Array.from(uniqueCustomers.values());
				
				// Upsert customers in chunks
				let totalCustomersSaved = 0;

				if (customersArray.length > BATCH_SIZE) {
					const totalChunks = Math.ceil(customersArray.length / BATCH_SIZE);
					console.log(`📊 Processing ${customersArray.length} customers in ${totalChunks} chunks of ${BATCH_SIZE}...`);

					for (let i = 0; i < customersArray.length; i += BATCH_SIZE) {
						const chunk = customersArray.slice(i, i + BATCH_SIZE);
						const currentChunk = Math.floor(i / BATCH_SIZE) + 1;
						console.log(`🔄 Processing customers chunk (${currentChunk}/${totalChunks}) - ${chunk.length} customers...`);

						const { error: customersError } = await supabase
							.from('customers')
							.upsert(chunk, { 
								onConflict: 'customer_id',
								ignoreDuplicates: false 
							});

						if (customersError) {
							console.error(`❌ Error in customers upsert chunk (${currentChunk}/${totalChunks}):`, customersError);
							throw customersError;
						}

						totalCustomersSaved += chunk.length;
						console.log(`✅ Customers chunk (${currentChunk}/${totalChunks}) completed. Progress: ${totalCustomersSaved}/${customersArray.length} customers saved`);
					}
				} else {
					console.log(`📊 Processing ${customersArray.length} customers in single batch...`);
					const { error: customersError } = await supabase
						.from('customers')
						.upsert(customersArray, { 
							onConflict: 'customer_id',
							ignoreDuplicates: false 
						});

					if (customersError) {
						console.error('❌ Error saving customers:', customersError);
						throw customersError;
					}

					totalCustomersSaved = customersArray.length;
				}

				console.log(`✅ Successfully saved ${totalCustomersSaved} customers to customers table using upsert`);
			}

			// Save orders using upsert
			let totalSaved = 0;

			if (orderDataArray.length > BATCH_SIZE) {
				const totalChunks = Math.ceil(orderDataArray.length / BATCH_SIZE);
				console.log(`📦 Large dataset detected (${orderDataArray.length} orders). Processing in ${totalChunks} chunks of ${BATCH_SIZE}...`);

				for (let i = 0; i < orderDataArray.length; i += BATCH_SIZE) {
					const chunk = orderDataArray.slice(i, i + BATCH_SIZE);
					const currentChunk = Math.floor(i / BATCH_SIZE) + 1;
					console.log(`🔄 Processing orders chunk (${currentChunk}/${totalChunks}) - ${chunk.length} orders...`);

					if (socket) {
						const progress = 25 + Math.floor((currentChunk / totalChunks) * 60); // Progress from 25% to 85%
						socket.emit('syncProgress', {
							stage: 'saving',
							message: `💾 Saving orders chunk (${currentChunk}/${totalChunks}) - ${chunk.length} orders...`,
							progress: progress,
							total: orders.length,
							current: totalSaved
						});
					}

					const { error } = await supabase
						.from('orders')
						.upsert(chunk, { 
							onConflict: 'shopify_order_id',
							ignoreDuplicates: false 
						});

					if (error) {
						console.error(`❌ Error in orders upsert chunk (${currentChunk}/${totalChunks}):`, error);
						throw error;
					}

					totalSaved += chunk.length;
					console.log(`✅ Orders chunk (${currentChunk}/${totalChunks}) completed. Progress: ${totalSaved}/${orderDataArray.length} orders saved`);
				}
			} else {
				// Single batch operation for smaller datasets
				if (socket) {
					socket.emit('syncProgress', {
						stage: 'saving',
						message: `💾 Saving ${orderDataArray.length} orders to database using upsert...`,
						progress: 85,
						total: orders.length,
						current: orderDataArray.length
					});
				}

				const { data, error } = await supabase
					.from('orders')
					.upsert(orderDataArray, { 
						onConflict: 'shopify_order_id',
						ignoreDuplicates: false 
					});

				if (error) {
					console.error('❌ Error in orders upsert:', error);
					throw error;
				}

				totalSaved = orderDataArray.length;
			}

			// Save line items using upsert
			if (lineItemsData.length > 0) {
				console.log(`📦 Saving ${lineItemsData.length} line items to database using upsert...`);

				if (socket) {
					socket.emit('syncProgress', {
						stage: 'saving',
						message: `💾 Saving ${lineItemsData.length} line items using upsert...`,
						progress: 90,
						total: orders.length,
						current: orders.length
					});
				}

				// Save line items in chunks
				const LINE_ITEMS_BATCH_SIZE = 1000;
				let totalLineItemsSaved = 0;

				if (lineItemsData.length > LINE_ITEMS_BATCH_SIZE) {
					const totalLineItemChunks = Math.ceil(lineItemsData.length / LINE_ITEMS_BATCH_SIZE);
					console.log(`📦 Processing ${lineItemsData.length} line items in ${totalLineItemChunks} chunks of ${LINE_ITEMS_BATCH_SIZE}...`);

					for (let i = 0; i < lineItemsData.length; i += LINE_ITEMS_BATCH_SIZE) {
						const chunk = lineItemsData.slice(i, i + LINE_ITEMS_BATCH_SIZE);
						const currentChunk = Math.floor(i / LINE_ITEMS_BATCH_SIZE) + 1;
						console.log(`🔄 Processing line items chunk (${currentChunk}/${totalLineItemChunks}) - ${chunk.length} items...`);

						const { error: lineItemsError } = await supabase
							.from('order_line_items')
							.upsert(chunk, { 
								onConflict: 'line_item_id',
								ignoreDuplicates: false 
							});

						if (lineItemsError) {
							console.error(`❌ Error in line items upsert chunk (${currentChunk}/${totalLineItemChunks}):`, lineItemsError);
							throw lineItemsError;
						}

						totalLineItemsSaved += chunk.length;
						console.log(`✅ Line items chunk (${currentChunk}/${totalLineItemChunks}) completed. Progress: ${totalLineItemsSaved}/${lineItemsData.length} items saved`);
					}
				} else {
					const { error: lineItemsError } = await supabase
						.from('order_line_items')
						.upsert(lineItemsData, { 
							onConflict: 'line_item_id',
							ignoreDuplicates: false 
						});

					if (lineItemsError) {
						console.error('❌ Error in line items upsert:', lineItemsError);
						throw lineItemsError;
					}

					totalLineItemsSaved = lineItemsData.length;
				}

				console.log(`✅ Successfully saved ${totalLineItemsSaved} line items to database using upsert`);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			console.log(`✅ Successfully saved ${totalSaved} orders, ${lineItemsData.length} line items, and ${uniqueCustomers.size} customers to database using upsert`);
			console.log(`⏱️  Upsert operation completed in ${duration}ms (${Math.round(totalSaved / (duration / 1000))} orders/second)`);
			return { 
				count: totalSaved, 
				lineItemsCount: lineItemsData.length,
				customersCount: uniqueCustomers.size
			};
		} catch (error) {
			console.error('Error saving orders to database:', error);
			throw error;
		}
	}

	async getRevenueData(startDate, endDate) {
		try {
			const { data, error } = await supabase
				.from('orders')
				.select('created_at, total_price, financial_status')
				.gte('created_at', startDate)
				.lte('created_at', endDate)
				.eq('financial_status', 'paid');

			if (error) throw error;

			// Group by date and calculate daily revenue
			const dailyRevenue = {};
			data.forEach(order => {
				const date = new Date(order.created_at).toISOString().split('T')[0];
				if (!dailyRevenue[date]) {
					dailyRevenue[date] = { revenue: 0, count: 0 };
				}
				dailyRevenue[date].revenue += parseFloat(order.total_price);
				dailyRevenue[date].count += 1;
			});

			return Object.entries(dailyRevenue).map(([date, data]) => ({
				date,
				daily_revenue: data.revenue,
				order_count: data.count
			}));
		} catch (error) {
			console.error('Error getting revenue data:', error);
			throw error;
		}
	}

	async syncOrders(limit = 50, syncDate = null, socket = null) {
		try {
			console.log('🔄 Starting order sync...');
			console.log(`📊 Fetching all orders (${limit} per page)`);

			// Emit initial progress
			if (socket) {
				socket.emit('syncProgress', {
					stage: 'starting',
					message: '🔄 Starting order sync...',
					progress: 0,
					total: 'unlimited'
				});
			}

			if (syncDate) {
				console.log(`🗓️  Sync date specified: ${syncDate}`);
				if (socket) {
					socket.emit('syncProgress', {
						stage: 'deleting',
						message: '🗑️  Deleting existing orders from sync date onwards...',
						progress: 5,
						total: 'unlimited'
					});
				}
				console.log('🗑️  Deleting existing analytics from sync date onwards...');
			}

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'fetching',
					message: '📥 Fetching orders from Shopify...',
					progress: 10,
					total: 'unlimited'
				});
			}

			const orders = await this.fetchOrders(limit, null, syncDate, socket);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'saving',
					message: `💾 Saving ${orders.length} orders to database...`,
					progress: 25,
					total: orders.length,
					current: 0
				});
			}

			await this.saveOrdersToDatabase(orders, socket);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'sync_completed',
					message: '✅ Order sync completed! Starting analytics calculation...',
					progress: 100,
					total: orders.length,
					ordersCount: orders.length
				});
			}

			console.log('✅ Order sync completed');
			return orders.length;
		} catch (error) {
			console.error('❌ Error syncing orders:', error);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'error',
					message: `❌ Error syncing orders: ${error.message}`,
					progress: 0,
					total: 'unlimited',
					error: error.message
				});
			}

			throw error;
		}
	}

	async deleteOrdersFromDate(syncDate) {
		try {
			console.log(`🗑️  Attempting to delete orders from ${syncDate} onwards...`);

			const { error } = await supabase
				.from('orders')
				.delete()
				.gte('created_at', syncDate);

			if (error) {
				console.error('❌ Error deleting orders:', {
					message: error.message,
					details: error.details,
					code: error.code,
					hint: error.hint
				});
				throw error;
			}

			console.log(`🗑️  Deleted orders from ${syncDate} onwards`);
		} catch (error) {
			console.error('❌ Error deleting orders from date:', {
				message: error.message,
				stack: error.stack,
				name: error.name
			});

			// If it's a network error, provide helpful information
			if (error.message && error.message.includes('fetch failed')) {
				console.error('🌐 Network connectivity issue detected');
				console.error('   - Check your internet connection');
				console.error('   - Verify Supabase is accessible');
				console.error('   - Try again in a few minutes');
			}

			throw error;
		}
	}

	async processCustomerChunk(customers) {
		try {
			// Process each customer individually to handle first_order_date logic
			for (const customer of customers) {
				// Check if customer already exists
				const { data: existingCustomer, error: fetchError } = await supabase
					.from('customers')
					.select('first_order_date')
					.eq('customer_id', customer.customer_id)
					.eq('store_id', customer.store_id)
					.single();

				if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
					console.error(`❌ Error fetching existing customer ${customer.customer_id}:`, fetchError);
					throw fetchError;
				}

				if (existingCustomer) {
					// Customer exists - check if we should update first_order_date
					if (existingCustomer.first_order_date) {
						const existingDate = new Date(existingCustomer.first_order_date);
						const newDate = new Date(customer.first_order_date);
						
						// Only update if the new order date is earlier
						if (newDate < existingDate) {
							console.log(`🔄 Updating first_order_date for customer ${customer.customer_id} from ${existingDate.toISOString()} to ${newDate.toISOString()}`);
							customer.first_order_date = newDate.toISOString();
						} else {
							// Keep the existing first_order_date
							customer.first_order_date = existingCustomer.first_order_date;
						}
					}
					// If no existing first_order_date, use the current one
				}
				// If customer doesn't exist, first_order_date is already set to the current order date
			}

			// Now upsert all customers with the correct first_order_date values
			const { error: upsertError } = await supabase
				.from('customers')
				.upsert(customers, { 
					onConflict: 'customer_id',
					ignoreDuplicates: false 
				});

			if (upsertError) {
				console.error('❌ Error upserting customers:', upsertError);
				throw upsertError;
			}

			console.log(`✅ Successfully processed ${customers.length} customers with first_order_date logic`);
		} catch (error) {
			console.error('❌ Error processing customer chunk:', error);
			throw error;
		}
	}
}

module.exports = ShopifyService; 