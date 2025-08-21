const axios = require('axios');
const { supabase, insert, update, select } = require('../config/database-supabase');
const analyticsService = require('./analyticsService');
const common = require('../config/common');

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

class ShopifyService {
	constructor(storeId = 'buycosari') {
		this.storeId = storeId;
		this.setupStoreConfig();
	}

	// Helper function to send WebSocket messages
	sendWebSocketMessage(socket, eventType, data) {
		if (socket && socket.readyState === 1) { // WebSocket.OPEN
			const message = JSON.stringify({
				type: eventType,
				data: data,
				timestamp: Date.now()
			});
			console.log(message, socket.id)
			socket.send(message);
		}
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
	}

	async fetchOrders(limit = 50, since_id = null, syncDate = null, socket = null, socketStatus = null) {
		try {
			let allOrders = [], orders = [];
			let totalFetched = 0;
			let pageCount = 0;
			if (this.storeId == "buycosari") {
				if (new Date(syncDate) < new Date("2023-10-30")) {
					syncDate = "2023-10-30";
				}
			}
			else if (this.storeId == "meonutrition") {
				if (new Date(syncDate) < new Date("2025-05-19")) {
					syncDate = "2025-05-19";
				}
			}
			else if (this.storeId == "dermao") {
				if (new Date(syncDate) < new Date("2024-05-01")) {
					syncDate = "2024-05-01";
				}
			}
			else if (this.storeId == "nomobark") {
				if (new Date(syncDate) < new Date("2024-05-14")) {
					syncDate = "2024-05-14";
				}
			}
			else if (this.storeId == "gamoseries") {
				if (new Date(syncDate) < new Date("2025-06-26")) {
					syncDate = "2025-06-26";
				}
			}
			else if (this.storeId == "cosara") {
				if (new Date(syncDate) < new Date("2025-05-27")) {
					syncDate = "2025-05-27";
				}
			}
			var nextPage = false, pageInfo = "";
			var now = common.createLocalDateWithTime(new Date());
			var totalDiff = common.diffInMilliSeconds(now, common.createLocalDateWithTime(syncDate));
			var lastDate;
			while (true) {
				pageCount++;
				let url = `${this.baseURL}/orders.json?limit=${limit}&status=any`;

				if (nextPage && pageInfo) {
					// Don't double-encode the page_info - it's already properly encoded
					url = `${this.baseURL}/orders.json?limit=${limit}&page_info=${pageInfo}`;
				} else if (syncDate) {
					url += `&updated_at_min=${syncDate}`;
				}

				// Emit progress update for each page

				const response = await axios.get(url, { headers: this.headers });
				orders = response.data.orders;

				if (orders.length > 0) {
					var minDate = orders.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))?.[0]?.updated_at;
					minDate = common.createLocalDateWithTime(minDate);
					if (lastDate) {
						if (minDate.getTime() > lastDate.getTime()) {
							minDate = lastDate;
						}
					}
					lastDate = minDate;
					var diff = common.diffInMilliSeconds(minDate, now);
					console.log(diff, totalDiff)
					if (diff < 0) diff = 0;
					if (socket) {
						console.log(socket)
						let progress = Number((100 * diff / totalDiff).toFixed(1));
						if (progress > 100) progress = 100;
						this.sendWebSocketMessage(socket, socketStatus, {
							stage: 'fetching',
							message: `📥 Fetching page ${pageCount}... (${totalFetched} orders so far)`,
							progress: progress,
							total: 'unlimited',
							current: totalFetched
						});
					}
				}
				const linkHeader = response.headers['link'];

				if (linkHeader && linkHeader.includes('rel="next"')) {
					const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
					const nextUrl = match ? match[1] : null;

					// Extract page_info from the nextUrl
					const urlObj = new URL(nextUrl);
					pageInfo = urlObj.searchParams.get('page_info');
					nextPage = true;
				} else {
					nextPage = false;
				}

				allOrders = allOrders.concat(orders);
				totalFetched += orders.length;

				// No max orders limit - fetch all available orders

				// If we got fewer orders than the limit, we've reached the end
				if (orders.length < limit) {
					break;
				}

				if (!nextPage) {
					break;
				}

				// Add a small delay to avoid rate limiting
			}

			console.log("sync completed")

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'fetching',
					message: `📥 Fetching page ${pageCount}... (${totalFetched} orders so far)`,
					progress: 100,
					total: 'unlimited',
					current: totalFetched
				});
			}

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

	async saveOrdersToDatabase(orders, socket = null, socketStatus = null) {
		try {

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'saving',
					message: `💾 Preparing to save ${orders.length} orders...`,
					progress: 0,
					total: orders.length,
					current: 0
				});
			}

			var productSkusData = [], productsData = [];
			if (this.storeId == "meonutrition") {
				const {count: productSkuCount} = await supabase.from("product_skus").select("*", {count: 'exact', head: true}).eq("store_id", this.storeId);
				for (var i = 0; i < productSkuCount; i+= 1000) {
					const {data: skuDatas, error: skuError} = await supabase.from("product_skus").select("sku_id, product_ids").eq("store_id", this.storeId).range(i, i + 999);
					if (skuError) throw skuError;
					productSkusData.push(...skuDatas);
				}

				const {count: productsCount} = await supabase.from("products").select("*", {count: 'exact', head: true}).eq("store_id", this.storeId);
				for (var i = 0; i < productsCount; i+= 1000) {
					const {data: productsDatas, error: productsError} = await supabase.from("products").select("product_id").eq("store_id", this.storeId).range(i, i + 999);
					if (productsError) throw productsError;
					productsData.push(...productsDatas);
				}
			}

			console.log(productSkusData.length, productsData.length);

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

				if (socket) {
					this.sendWebSocketMessage(socket, socketStatus, {
						stage: 'saving',
						message: `Getting Customers...`,
						progress: 0 + Math.floor((currentChunk / Math.ceil(customerCount / chunk)) * 20),
						total: customerCount,
						current: i + customers.length
					});
				}
			}
			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'saving',
					message: `Getting Customers...`,
					progress: 20,
					total: customerCount,
					current: customerCount
				});
			}
			const uniqueProducts = new Map();
			const lineItemsData = [];
			var updateProductSkus = [], uniqueProductSkus = new Map();
			orders.forEach((order) => {
				// Extract customer data if customer exists
				var priceStr = {};
				if (order.line_items && order.line_items.length > 0) {
					order.line_items.forEach(lineItem => {
						// Skip line items without product_id
						if (!lineItem.product_id) {
							return;
						}
						const productId = lineItem.product_id.toString();
						// Add to unique products map
						if (!lineItem.sku || this.storeId != "meonutrition") {
							lineItem.sku = productId;
						}

						if (!uniqueProducts.has(productId)) {
							uniqueProducts.set(productId, {
								product_id: productId,
								store_id: this.storeId, // Add store ID
								product_sku_id: lineItem.sku || productId,
								product_title: lineItem.title || 'Unknown Product',
								vendor: lineItem.vendor || null,
								status: 'active',
								created_at: new Date().toISOString(),
								updated_at: new Date().toISOString()
							});
						}
						
						var sku = lineItem.sku.includes("-") ? lineItem.sku.split("-")[0] + "-" + lineItem.sku.split("-")[1] : lineItem.sku;
						if (!updateProductSkus.includes(sku)) {
							updateProductSkus.push(sku);
						}
						var totalPrice = parseFloat(lineItem.price || 0) * (lineItem.quantity || 1) - lineItem.total_discount;
						var refundPrice = 0;
						if (lineItem.sku) {
							if (!priceStr[lineItem.sku]) {
								priceStr[lineItem.sku] = 0;
							}
							if (order.financial_status == "refunded") {
								priceStr[lineItem.sku] += 0;
								refundPrice += totalPrice;
							}
							else if(order.financial_status == "partially_refunded") {
								priceStr[lineItem.sku] += totalPrice;
								order.refunds.forEach(refund => {
									if (refund.line_item_id == lineItem.id) {
										totalPrice -= refund.amount;
										priceStr[lineItem.sku] -= refund.amount;
										refundPrice += refund.amount;
									}
								});
							}
							else {
								priceStr[lineItem.sku] += totalPrice;
							}
						}
						if (order.product_sku_ids) {
							if (!order.product_sku_ids.includes(lineItem.sku)) {
								order.product_sku_ids += "," + lineItem.sku;
							}
						}
						else {
							order.product_sku_ids = lineItem.sku;
						}
						if (!order.financial_status) {
							order.financial_status = "unpaid";
						}

						if (this.storeId == "meonutrition") {
							var productSku = productSkusData.find(productSku => productSku.sku_id == lineItem.sku);
							if (productSku) {
								if (!productSku.product_ids.includes(productId) && !productsData.find(_product => _product.product_id == productId)) {
									productSku.product_ids += "," + productId;
									if (!uniqueProductSkus.has(productSku.sku_id)) {
										uniqueProductSkus.set(productSku.sku_id, {
											sku_id: productSku.sku_id,
											product_ids: productSku.product_ids
										});
									}
									else {
										uniqueProductSkus.get(productSku.sku_id).product_ids += "," + productId;
									}
								}
							}
						}
						// Prepare line item data
						lineItemsData.push({
							shopify_order_id: order.id.toString(),
							store_id: this.storeId, // Add store ID
							customer_id: order.customer ? order.customer.id.toString() : null,
							financial_status: order.financial_status,
							line_item_id: lineItem.id.toString(),
							product_id: productId,
							product_title: lineItem.title || 'Unknown Product',
							variant_id: lineItem.variant_id?.toString() || null,
							variant_title: lineItem.variant_title || null,
							sku: lineItem.sku || productId,
							quantity: lineItem.quantity || 1,
							price: parseFloat(lineItem.price || 0),
							total_price: parseFloat(lineItem.price || 0) * (lineItem.quantity || 1) - lineItem.total_discount,
							refund_price: refundPrice,
							created_at: new Date(order.created_at).toISOString()
						});
					});
				}

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
							first_order_id: customer ? customer.first_order_id : order.id.toString(),
							first_order_prices: customer ? customer.first_order_prices : JSON.stringify(priceStr),
							first_order_sku: customer ? customer.first_order_sku : order.product_sku_ids
						});
					}
					else {
						if (uniqueCustomers.get(customerId).first_order_date > order.created_at) {
							uniqueCustomers.get(customerId).first_order_date = new Date(order.created_at).toISOString();
							uniqueCustomers.get(customerId).first_order_id = order.id.toString();
							uniqueCustomers.get(customerId).first_order_sku = order.product_sku_ids;
							uniqueCustomers.get(customerId).first_order_prices = JSON.stringify(priceStr);
						}
					}
				}

				let totalRefunds = 0;
				if (order.financial_status == "partially_refunded") {
					totalRefunds = order.refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0);
				}
				else if (order.financial_status == "refunded") {
					totalRefunds = order.total_price;
				}
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
					customer_id: order.customer?.id?.toString() || null,
					product_sku_ids: order.product_sku_ids || "",
					refund_price: totalRefunds
				})
			})
			
			// Extract unique products from line items and prepare for products table
			
			await supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")}).eq('store_id', this.storeId).in('product_sku', updateProductSkus);
			
			console.log(uniqueProductSkus.values());
			if (this.storeId == "meonutrition") {
				await supabase.from("product_skus").upsert(Array.from(uniqueProductSkus.values()), {
					onConflict: 'sku_id',
					ignoreDuplicates: false
				});
			}
			const startTime = Date.now();

			if (lineItemsData.length > 0) {
				if (socket) {
					this.sendWebSocketMessage(socket, socketStatus, {
						stage: 'saving',
						message: `💾 Saving ${lineItemsData.length} line items...`,
						progress: 30,
						total: orders.length,
						current: orders.length
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
						const progress = Math.round(((i + chunk.length) / lineItemsData.length) * 100);
						
						// Emit progress to frontend for each chunk
						if (socket) {
							this.sendWebSocketMessage(socket, socketStatus, {
								stage: 'saving',
								message: `💾 Saving ${lineItemsData.length} line items...`,
								progress: 10 + Math.floor((currentChunk / totalLineItemChunks) * 30),
								total: lineItemsData.length,
								current: i + chunk.length
							});
						}

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

			}

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'saving',
					message: `💾 Saving ${lineItemsData.length} line items...`,
					progress: 40,
					total: orders.length,
					current: orders.length
				});
			}
			const { data: productRevenue, error: productRevenueError } = await supabase
				.rpc('get_product_revenue_by_id', {
					store_id_filter: this.storeId
				});
			
			productRevenue.forEach(product => {
				if (uniqueProducts.get(product.product_id)) {
					uniqueProducts.get(product.product_id).sale_price = parseFloat(product.total_revenue);
					uniqueProducts.get(product.product_id).sale_quantity = parseInt(product.total_quantity);
				}
			});

			if (productRevenueError) {
				console.error('❌ Error getting product revenue:', productRevenueError);
				throw productRevenueError;
			}
			// Save unique products to products table
			if (uniqueProducts.size > 0) {
				
				const productsArray = Array.from(uniqueProducts.values());
				
				// Upsert products in chunks
				const BATCH_SIZE = 1000;
				let totalProductsSaved = 0;

				if (productsArray.length > BATCH_SIZE) {
					const totalChunks = Math.ceil(productsArray.length / BATCH_SIZE);

					for (let i = 0; i < productsArray.length; i += BATCH_SIZE) {
						const chunk = productsArray.slice(i, i + BATCH_SIZE);
						const currentChunk = Math.floor(i / BATCH_SIZE) + 1;

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

						if (socket) {
							this.sendWebSocketMessage(socket, socketStatus, {
								stage: 'saving',
								message: `💾 Saving ${uniqueProducts.size} unique products to products table...`,
								progress: 40 + Math.floor((currentChunk / totalChunks) * 10),
								total: uniqueProducts.size,
								current: totalProductsSaved
							});
						}

						totalProductsSaved += chunk.length;
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

			}

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'saving',
					message: `💾 Saving ${uniqueProducts.size} unique products to products table...`,
					progress: 50,
					total: uniqueProducts.length,
					current: uniqueProducts.length
				});
			}
			// Save unique customers to customers table
			const BATCH_SIZE = 1000;
			if (uniqueCustomers.size > 0) {
				
				const customersArray = Array.from(uniqueCustomers.values());
				
				// Upsert customers in chunks
				let totalCustomersSaved = 0;

				if (customersArray.length > BATCH_SIZE) {
					const totalChunks = Math.ceil(customersArray.length / BATCH_SIZE);

					for (let i = 0; i < customersArray.length; i += BATCH_SIZE) {
						const chunk = customersArray.slice(i, i + BATCH_SIZE);
						const currentChunk = Math.floor(i / BATCH_SIZE) + 1;
						const progress = Math.round(((i + chunk.length) / customersArray.length) * 100);

						// Emit progress to frontend for each customers chunk
						if (socket) {
							this.sendWebSocketMessage(socket, socketStatus, {
								stage: 'saving',
								message: `👥 Processing customers chunk ${currentChunk}/${totalChunks} (${progress}% - ${i + chunk.length}/${customersArray.length} customers)...`,
								progress: 50 + Math.floor((currentChunk / totalChunks) * 20), // Progress from 98% to 100%
								total: customersArray.length,
								current: i + chunk.length
							});
						}

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
					}
				} else {
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

			}


			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'saving',
					message: `💾 Saving ${uniqueCustomers.size} unique customers to customers table...`,
					progress: 70,
					total: uniqueCustomers.length,
					current: uniqueCustomers.length
				});
			}
			// Save orders
			let totalSaved = 0;

			if (orderDataArray.length > BATCH_SIZE) {
				const totalChunks = Math.ceil(orderDataArray.length / BATCH_SIZE);

				for (let i = 0; i < orderDataArray.length; i += BATCH_SIZE) {
					const chunk = orderDataArray.slice(i, i + BATCH_SIZE);
					const currentChunk = Math.floor(i / BATCH_SIZE) + 1;

					if (socket) {
						const progress = 70 + Math.floor((currentChunk / totalChunks) * 30); // Progress from 25% to 85%
						this.sendWebSocketMessage(socket, socketStatus, {
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
				}
			} else {
				// Single batch operation for smaller datasets
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
				if (socket) {
					this.sendWebSocketMessage(socket, socketStatus, {
						stage: 'saving',
						message: `💾 Saving ${orderDataArray.length} orders to database...`,
						progress: 100,
						total: orders.length,
						current: orderDataArray.length
					});
				}
				totalSaved = orderDataArray.length;
			}
			// Save line items

			const endTime = Date.now();
			const duration = endTime - startTime;

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
				.select('created_at, total_price, financial_status, refund_price')
				.gte('created_at', startDate)
				.lte('created_at', endDate)
				.neq('financial_status', 'refunded');

			if (error) throw error;

			// Group by date and calculate daily revenue
			const dailyRevenue = {};
			data.forEach(order => {
				const date = new Date(order.created_at).toISOString().split('T')[0];
				if (!dailyRevenue[date]) {
					dailyRevenue[date] = { revenue: 0, count: 0 };
				}
				dailyRevenue[date].revenue += parseFloat(order.total_price) - parseFloat(order.refund_price);
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

	async syncOrders(limit = 50, syncDate = null, socket = null, socketStatus = null) {
		try {

			// Emit initial progress
			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'starting',
					message: '🔄 Starting order sync...',
					progress: 0,
					total: 'unlimited'
				});
			}

			var date = new Date();
			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'fetching',
					message: '📥 Fetching orders from Shopify...',
					progress: 0,
					total: 'unlimited'
				});
			}

			const orders = await this.fetchOrders(limit, null, syncDate, socket, socketStatus);

			await sleep(1000);
			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'saving',
					message: `💾 Saving ${orders.length} orders to database...`,
					progress: 0,
					total: orders.length,
					current: 0
				});
			}

			await this.saveOrdersToDatabase(orders, socket, socketStatus);

			console.log("saved all data")

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'sync_completed',
					message: '✅ Order sync completed!',
					progress: 100,
					total: orders.length,
					ordersCount: orders.length
				});
			}

			await analyticsService.recalculateOrdersOnlyFromDate(syncDate, socket, false, this.storeId, socketStatus);

			// Update sync tracking table
			await common.updateSyncTracking('last_sync_date', date, this.storeId);
			
			return orders.length;
		} catch (error) {
			console.error('❌ Error syncing orders:', error);

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
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

		} catch (error) {
			console.error('❌ Error processing customer chunk:', error);
			throw error;
		}
	}

	
}

module.exports = ShopifyService; 