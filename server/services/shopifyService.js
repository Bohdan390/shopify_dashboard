const axios = require('axios');
const { supabase, insert, update, select } = require('../config/database-supabase');
const analyticsService = require('./analyticsService');

class ShopifyService {
	constructor() {
		this.baseURL = `https://${process.env.SHOPIFY_SHOP_URL}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
		this.headers = {
			'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
			'Content-Type': 'application/json'
		};
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
					const progress = Math.min(15 + (pageCount * 10), 75); // Progress from 15% to 75%
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
			console.log(`🔄 Preparing to save ${orders.length} orders to database...`);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'saving',
					message: `💾 Preparing to save ${orders.length} orders...`,
					progress: 80,
					total: orders.length
				});
			}

			// Transform all orders to database format
			const orderDataArray = [];
			const orderIds = [];
			orders.forEach((order) => {
				orderIds.push(order.id.toString())
				orderDataArray.push({
					shopify_order_id: order.id.toString(),
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
			})
			
			console.log(orderDataArray.length, "orderDataArray")
			// Extract unique products from line items and prepare for products table
			const uniqueProducts = new Map();
			const lineItemsData = [];
			
			console.log(orders[0])
			var t = 0, tt = 0, c = 0;
			orders.forEach(order => {
				t += parseFloat(order.total_price);
				c += order.line_items.length;
				if (order.line_items && order.line_items.length > 0) {
					order.line_items.forEach(lineItem => {
						// Skip line items without product_id
						if (!lineItem.product_id) {
							console.log(`⚠️  Skipping line item without product_id: ${lineItem.id}`);
							return;
						}
						tt += parseFloat(parseFloat(lineItem.price || 0) * (lineItem.quantity || 1))
						const productId = lineItem.product_id.toString();
						
						// Add to unique products map
						if (!uniqueProducts.has(productId)) {
							uniqueProducts.set(productId, {
								product_id: productId,
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
			tt = 0;
			lineItemsData.forEach(lineItem => {
				tt += parseFloat(lineItem.total_price)
			})
			console.log(t, tt, c, "order_line_items length")
			const startTime = Date.now();

			// Extract all shopify_order_ids for deletion
			console.log(`🗑️  Deleting ${orderIds.length} existing orders and line items before inserting...`);

			// Delete existing line items first (due to foreign key constraint) - CHUNKED
			const BATCH_SIZE = 1000;
			if (lineItemsData.length > 0) {
				
				if (orderIds.length > BATCH_SIZE) {
					console.log(`🗑️  Large line items deletion detected (${orderIds.length} orders). Processing deletions in chunks of ${BATCH_SIZE}...`);
					
					const totalLineItemDeleteChunks = Math.ceil(orderIds.length / BATCH_SIZE);
					let totalLineItemsDeleted = 0;
					
					for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
						const deleteChunk = orderIds.slice(i, i + BATCH_SIZE);
						const currentChunk = Math.floor(i / BATCH_SIZE) + 1;
						console.log(`🗑️  Deleting line items chunk ${currentChunk}/${totalLineItemDeleteChunks} (${deleteChunk.length} orders)...`);
						
						const { error: deleteLineItemsError } = await supabase
							.from('order_line_items')
							.delete()
							.in('shopify_order_id', deleteChunk);
						
						if (deleteLineItemsError) {
							console.error(`❌ Error deleting line items chunk ${currentChunk}:`, deleteLineItemsError);
							throw deleteLineItemsError;
						}
						
						totalLineItemsDeleted += deleteChunk.length;
						console.log(`✅ Line items delete chunk ${currentChunk} completed. Total processed: ${totalLineItemsDeleted}/${orderIds.length}`);
					}
				} else {
					// Single deletion for smaller datasets
					const { error: deleteLineItemsError } = await supabase
						.from('order_line_items')
						.delete()
						.in('shopify_order_id', orderIds);
					
					if (deleteLineItemsError) {
						console.error('❌ Error deleting existing line items:', deleteLineItemsError);
						throw deleteLineItemsError;
					}
				}
				console.log(`🗑️  Deleted existing line items for ${orderIds.length} orders`);
			}

			// Delete existing orders in chunks to avoid IN clause limits - CHUNKED
			let totalDeleted = 0;

			if (orderIds.length > BATCH_SIZE) {
				console.log(`📦 Large deletion detected (${orderIds.length} orders). Processing deletions in chunks of ${BATCH_SIZE}...`);

				const totalDeleteChunks = Math.ceil(orderIds.length / BATCH_SIZE);

				for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
					const deleteChunk = orderIds.slice(i, i + BATCH_SIZE);
					const currentDeleteChunk = Math.floor(i / BATCH_SIZE) + 1;
					console.log(`🗑️  Deleting orders chunk ${currentDeleteChunk}/${totalDeleteChunks} (${deleteChunk.length} orders)...`);

					const { error: deleteError } = await supabase
						.from('orders')
						.delete()
						.in('shopify_order_id', deleteChunk);

					if (deleteError) {
						console.error(`❌ Error deleting orders chunk ${currentDeleteChunk}:`, deleteError);
						throw deleteError;
					}

					totalDeleted += deleteChunk.length;
					console.log(`✅ Orders delete chunk ${currentDeleteChunk} completed. Total deleted: ${totalDeleted}/${orderIds.length}`);
				}
			} else {
				// Single deletion for smaller datasets
				const { error: deleteError } = await supabase
					.from('orders')
					.delete()
					.in('shopify_order_id', orderIds);

				if (deleteError) {
					console.error('❌ Error deleting existing orders:', deleteError);
					throw deleteError;
				}

				totalDeleted = orderIds.length;
			}

			console.log(`✅ Deleted ${totalDeleted} existing orders`);

			// Save unique products to products table first (to satisfy foreign key constraint)
			if (uniqueProducts.size > 0) {
				console.log(`📦 Saving ${uniqueProducts.size} unique products to products table...`);
				
				const productsArray = Array.from(uniqueProducts.values());
				
				// Check for existing products to avoid duplicates
				const productIds = productsArray.map(p => p.product_id);
				const { count: existingProductsCount } = await supabase
					.from('products')
					.select('*', { count: 'exact', head: true })
					.in('product_id', productIds);

				let existingProductMap = new Map();
				if (existingProductsCount > 0) {
					for (let i = 0; i < existingProductsCount; i += BATCH_SIZE) {
						const chunk = productIds.slice(i, i + BATCH_SIZE);
						const { data: existingProducts, error: existingError } = await supabase
							.from('products')
							.select('product_id, product_title')
							.in('product_id', chunk);

						if (existingError) {
							console.error('❌ Error checking existing products:', existingError);
							throw existingError;
						}

						existingProducts.forEach(product => {
							existingProductMap.set(product.product_id, product);
						});
					}
				}

				console.log(existingProductMap.size, 999)

				// Filter out products that already exist with same product_id
				const newProducts = productsArray.filter(product => {
					const existing = existingProductMap.get(product.product_id);
					if (existing) {
						console.log(`⚠️  Product ${product.product_id} already exists, skipping`);
						return false;
					}
					return true;
				});
				console.log(newProducts.length, 888)

				if (newProducts.length > 0) {
					console.log(`📦 Inserting ${newProducts.length} new products...`);
					
					// Insert only new products
					const { error: productsError } = await supabase
						.from('products')
						.insert(newProducts);

					if (productsError) {
						console.error('❌ Error saving products:', productsError);
						throw productsError;
					}

					console.log(`✅ Successfully saved ${newProducts.length} new products to products table`);
				} else {
					console.log('✅ All products already exist in database');
				}
			}

			// For very large datasets, process in chunks
			let totalSaved = 0;

			if (orderDataArray.length > BATCH_SIZE) {
				console.log(`📦 Large dataset detected (${orderDataArray.length} orders). Processing in chunks of ${BATCH_SIZE}...`);

				const totalChunks = Math.ceil(orderDataArray.length / BATCH_SIZE);

				for (let i = 0; i < orderDataArray.length; i += BATCH_SIZE) {
					const chunk = orderDataArray.slice(i, i + BATCH_SIZE);
					const currentChunk = Math.floor(i / BATCH_SIZE) + 1;
					console.log(`🔄 Processing chunk ${currentChunk}/${totalChunks} (${chunk.length} orders)...`);

					if (socket) {
						const progress = 80 + Math.floor((currentChunk / totalChunks) * 10); // Progress from 80% to 90%
						socket.emit('syncProgress', {
							stage: 'saving',
							message: `💾 Saving chunk ${currentChunk}/${totalChunks} (${chunk.length} orders)...`,
							progress: progress,
							total: orders.length,
							current: totalSaved
						});
					}

					const { error } = await supabase
						.from('orders')
						.insert(chunk);

					if (error) {
						console.error(`❌ Error in batch save chunk ${currentChunk}:`, error);
						throw error;
					}

					totalSaved += chunk.length;
					console.log(`✅ Chunk ${currentChunk} completed. Total saved: ${totalSaved}/${orderDataArray.length}`);
				}
			} else {
				// Single batch operation for smaller datasets
				if (socket) {
					socket.emit('syncProgress', {
						stage: 'saving',
						message: `💾 Saving ${orderDataArray.length} orders to database...`,
						progress: 85,
						total: orders.length
					});
				}

				const { data, error } = await supabase
					.from('orders')
					.insert(orderDataArray);

				if (error) {
					console.error('❌ Error in batch save:', error);
					throw error;
				}

				totalSaved = orderDataArray.length;
			}

			// Save line items if we have any
			if (lineItemsData.length > 0) {
				console.log(`📦 Saving ${lineItemsData.length} line items to database...`);

				if (socket) {
					socket.emit('syncProgress', {
						stage: 'saving',
						message: `💾 Saving ${lineItemsData.length} line items...`,
						progress: 90,
						total: orders.length
					});
				}

				// Save line items in chunks
				const LINE_ITEMS_BATCH_SIZE = 1000;
				let totalLineItemsSaved = 0;

				if (lineItemsData.length > LINE_ITEMS_BATCH_SIZE) {
					const totalLineItemChunks = Math.ceil(lineItemsData.length / LINE_ITEMS_BATCH_SIZE);

					for (let i = 0; i < lineItemsData.length; i += LINE_ITEMS_BATCH_SIZE) {
						const chunk = lineItemsData.slice(i, i + LINE_ITEMS_BATCH_SIZE);
						const currentChunk = Math.floor(i / LINE_ITEMS_BATCH_SIZE) + 1;
						console.log(`🔄 Processing line items chunk ${currentChunk}/${totalLineItemChunks} (${chunk.length} items)...`);

						const { error: lineItemsError } = await supabase
							.from('order_line_items')
							.insert(chunk);

						if (lineItemsError) {
							console.error(`❌ Error in line items batch save chunk ${currentChunk}:`, lineItemsError);
							throw lineItemsError;
						}

						totalLineItemsSaved += chunk.length;
						console.log(`✅ Line items chunk ${currentChunk} completed. Total saved: ${totalLineItemsSaved}/${lineItemsData.length}`);
					}
				} else {
					const { error: lineItemsError } = await supabase
						.from('order_line_items')
						.insert(lineItemsData);

					if (lineItemsError) {
						console.error('❌ Error in line items batch save:', lineItemsError);
						throw lineItemsError;
					}

					totalLineItemsSaved = lineItemsData.length;
				}

				console.log(`✅ Successfully saved ${totalLineItemsSaved} line items to database`);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			console.log(`✅ Successfully saved ${totalSaved} orders and ${lineItemsData.length} line items to database in batch operation(s)`);
			console.log(`⏱️  Batch operation completed in ${duration}ms (${Math.round(totalSaved / (duration / 1000))} orders/second)`);
			return { count: totalSaved, lineItemsCount: lineItemsData.length };
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
				await analyticsService.deleteAnalyticsFromDate(syncDate);
			}

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'fetching',
					message: '📥 Fetching orders from Shopify...',
					progress: 15,
					total: 'unlimited'
				});
			}

			const orders = await this.fetchOrders(limit, null, syncDate, socket);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'saving',
					message: '💾 Saving orders to database...',
					progress: 80,
					total: 'unlimited'
				});
			}

			await this.saveOrdersToDatabase(orders, socket);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'sync_completed',
					message: '✅ Order sync completed! Starting analytics calculation...',
					progress: 90,
					total: 'unlimited',
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
}

module.exports = new ShopifyService(); 