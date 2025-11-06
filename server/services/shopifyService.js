const axios = require('axios');
const { supabase, insert, update, select } = require('../config/database-supabase');
const analyticsService = require('./analyticsService');
const common = require('../config/common');
const G = require("../config/global")
const fs = require('fs');

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

class ShopifyService {
	constructor(storeId = 'buycosari') {
		this.storeId = storeId;
		this.setupStoreConfig();
	}


	// 	Traffic Junky API key:

	// 80e2ee9daf3f5e3a2a55aac5f323c082603d49e5e421178565fbbffd791b17e7192f3669837ddc74323946399cb0110dc1ad175cbc93819a9950937e081a3bbd


	// ExoClick

	// d9282a5d35877e0dbe360360fa392ceb19f4b0cf




	// These are two other platforms we are launching now in addition to facebook, taboola and google ads.


	// I have also integrated taboola ads into the windsor so you can pull the data there.
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
		var products = [];
		try {
			let allOrders = [], orders = [];
			let totalFetched = 0;
			let pageCount = 0;
			// if (this.storeId == "buycosari") {
			// 	if (new Date(syncDate) < new Date("2023-09-26")) {
			// 		syncDate = "2023-09-26";
			// 	}
			// }
			// else if (this.storeId == "meonutrition") {
			// 	if (new Date(syncDate) < new Date("2024-05-19")) {
			// 		syncDate = "2024-05-19";
			// 	}
			// }
			// else if (this.storeId == "dermao") {
			// 	if (new Date(syncDate) < new Date("2024-05-01")) {
			// 		syncDate = "2024-05-01";
			// 	}
			// }
			// else if (this.storeId == "nomobark") {
			// 	if (new Date(syncDate) < new Date("2024-05-14")) {
			// 		syncDate = "2024-05-14";
			// 	}
			// }
			// else if (this.storeId == "gamoseries") {
			// 	if (new Date(syncDate) < new Date("2025-06-26")) {
			// 		syncDate = "2025-06-26";
			// 	}
			// }
			// else if (this.storeId == "cosara") {
			// 	if (new Date(syncDate) < new Date("2024-05-27")) {
			// 		syncDate = "2024-05-27";
			// 	}
			// }
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

				orders.forEach((order) => {
					order.line_items.forEach((line_item) => {
						if (line_item.title && line_item.title.toLowerCase().includes("berberine") && !products.includes(line_item.title)) {
							products.push(line_item.title);
						}
					})
				})
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
					if (diff < 0) diff = 0;
					if (socket) {
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

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'fetching',
					message: `📥 Fetching page ${pageCount}... (${totalFetched} orders so far)`,
					progress: 100,
					total: 'unlimited',
					current: totalFetched
				});
			}

			await this.fetchAmazonSalesData("last_1d", this.storeId);
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

	async fetchAmazonSalesData(datePreset = 'last_7d', storeId = null) {
		try {

			var apiKey = process.env.WINDSOR_API_KEY;
			console.log(storeId, apiKey)
			if (storeId !== "meonutrition") {
				return []; // Only fetch for MEO Nutrition
			}

			const fields = [
				"account_name",
				"date",
				"marketplace_country",
				"sales_and_traffic_report_by_date__salesbydate_orderedproductsales_amount",
				"sales_and_traffic_report_by_date__salesbydate_refundrate",
				"sales_and_traffic_report_by_date__salesbydate_shippedproductsales_amount",
				"sales_and_traffic_report_by_date__salesbydate_totalorderitems",
				"sales_and_traffic_report_by_date__salesbydate_unitsordered",
				"sales_and_traffic_report_by_date__salesbydate_unitsshipped"
			].join(',');

			const query = {
				api_key: apiKey,
				date_preset: datePreset,
				fields: fields,
				_renderer: 'json'
			};

			const response = await axios.get(`${G.windsorURL}/amazon_sp`, {
				params: query
			});
			var amazonSalesData = [];
			if (response.data && response.data.data) {
				amazonSalesData = response.data.data.map(item => ({
					account_name: item.account_name,
					date: item.date,
					marketplace_country: item.marketplace_country,
					ordered_products_sales_amount: parseFloat(item.sales_and_traffic_report_by_date__salesbydate_orderedproductsales_amount) || 0,
					refund_rate: parseFloat(item.sales_and_traffic_report_by_date__salesbydate_refundrate) || 0,
					shipped_products_sales_amount: parseFloat(item.sales_and_traffic_report_by_date__salesbydate_shippedproductsales_amount) || 0,
					total_order_items: parseInt(item.sales_and_traffic_report_by_date__salesbydate_totalorderitems) || 0,
					units_ordered: parseInt(item.sales_and_traffic_report_by_date__salesbydate_unitsordered) || 0,
					units_shipped: parseInt(item.sales_and_traffic_report_by_date__salesbydate_unitsshipped) || 0,
					store_id: storeId
				}));
			}
			fs.writeFileSync("amazonSalesData.json", JSON.stringify(amazonSalesData, null, 2));
			await this.saveAmazonSalesDataToDatabase(amazonSalesData, null, null);
			return [];
		} catch (error) {
			console.error('❌ Error fetching Amazon sales data from Windsor.ai:', error.message);
			throw error;
		}
	}

	async saveAmazonSalesDataToDatabase(amazonSalesData, socket = null, socketStatus = null) {
		try {
			if (!amazonSalesData || amazonSalesData.length === 0) {
				return;
			}

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'saving_amazon_sales',
					message: `📊 Saving ${amazonSalesData.length} Amazon sales records to database...`,
					progress: 60,
					total: 'unlimited'
				});
			}

			var salesData = new Map()
			amazonSalesData.forEach(record => {
				if (!salesData.has(record.date)) {
					salesData.set(record.date, {
						...record
					})
				}
				else {
					salesData.get(record.date).ordered_products_sales_amount += record.ordered_products_sales_amount;
					salesData.get(record.date).total_order_items += record.total_order_items;
					salesData.get(record.date).units_ordered += record.units_ordered;
					salesData.get(record.date).units_shipped += record.units_shipped;
				}
			})

			// Save to amazon_revenue table
			const amazonRevenueRecords = Array.from(salesData.values()).map(record => ({
				date: record.date,
				store_id: record.store_id,
				total_revenue: record.ordered_products_sales_amount,
				orders_count: record.total_order_items,
				average_order_value: record.total_order_items > 0 ? record.ordered_products_sales_amount / record.total_order_items : 0,
				currency: 'USD',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}));

			// Save in chunks
			const chunkSize = 1000;
			const chunks = [];
			for (let i = 0; i < amazonRevenueRecords.length; i += chunkSize) {
				chunks.push(amazonRevenueRecords.slice(i, i + chunkSize));
			}

			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				const { error: amazonRevenueError } = await supabase
					.from('amazon_revenue')
					.upsert(chunk, {
						onConflict: 'date, store_id',
						ignoreDuplicates: false
					});

				if (amazonRevenueError) {
					console.error(`❌ Error saving Amazon revenue chunk ${i + 1}:`, amazonRevenueError);
					throw amazonRevenueError;
				}
			}
			console.log(`✅ Successfully saved ${amazonSalesData.length} Amazon sales records`);

		} catch (error) {
			console.error('❌ Error saving Amazon sales data to database:', error);
			throw error;
		}
	}
	async syncProducts(limit = 50, since_id = null, syncDate = null, socket = null, socketStatus = null) {
		var products = [];
		try {
			let storeProducts = [];
			let totalFetched = 0;
			let pageCount = 0;
			// if (this.storeId == "buycosari") {
			// 	if (new Date(syncDate) < new Date("2023-09-26")) {
			// 		syncDate = "2023-09-26";
			// 	}
			// }
			// else if (this.storeId == "meonutrition") {
			// 	if (new Date(syncDate) < new Date("2024-05-19")) {
			// 		syncDate = "2024-05-19";
			// 	}
			// }
			// else if (this.storeId == "dermao") {
			// 	if (new Date(syncDate) < new Date("2024-05-01")) {
			// 		syncDate = "2024-05-01";
			// 	}
			// }
			// else if (this.storeId == "nomobark") {
			// 	if (new Date(syncDate) < new Date("2024-05-14")) {
			// 		syncDate = "2024-05-14";
			// 	}
			// }
			// else if (this.storeId == "gamoseries") {
			// 	if (new Date(syncDate) < new Date("2025-06-26")) {
			// 		syncDate = "2025-06-26";
			// 	}
			// }
			// else if (this.storeId == "cosara") {
			// 	if (new Date(syncDate) < new Date("2024-05-27")) {
			// 		syncDate = "2024-05-27";
			// 	}
			// }
			var nextPage = false, pageInfo = "";
			var lastDate;
			while (true) {
				pageCount++;
				let url = `${this.baseURL}/products.json?limit=${limit}`;

				if (nextPage && pageInfo) {
					// Don't double-encode the page_info - it's already properly encoded
					url = `${this.baseURL}/products.json?limit=${limit}&page_info=${pageInfo}`;
				}

				// Emit progress update for each page

				const response = await axios.get(url, { headers: this.headers });
				products = response.data.products;

				products.forEach((product) => {
					products.push(product.title);
				})
				if (products.length > 0) {
					var minDate = products.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))?.[0]?.updated_at;
					minDate = common.createLocalDateWithTime(minDate);
					if (lastDate) {
						if (minDate.getTime() > lastDate.getTime()) {
							minDate = lastDate;
						}
					}
					lastDate = minDate;
					if (socket) {
						let progress = Number((100 * diff / totalDiff).toFixed(1));
						if (progress > 100) progress = 100;
						this.sendWebSocketMessage(socket, socketStatus, {
							stage: 'fetching',
							message: `📥 Fetching page ${pageCount}... (${totalFetched} products so far)`,
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

				products.forEach((product) => {
					if (!storeProducts.find(p => p.id == product.id)) {
						storeProducts.push(product)
					}
				})
				totalFetched += products.length;
				// No max orders limit - fetch all available orders

				// If we got fewer orders than the limit, we've reached the end
				if (products.length < limit) {
					break;
				}

				if (!nextPage) {
					break;
				}
				// Add a small delay to avoid rate limiting
			}

			if (socket) {
				this.sendWebSocketMessage(socket, socketStatus, {
					stage: 'fetching',
					message: `📥 Fetching page ${pageCount}... (${totalFetched} products so far)`,
					progress: 100,
					total: 'unlimited',
					current: totalFetched
				});
			}

			const { count: productCount } = await supabase
				.from('products')
				.select('*', { count: 'exact', head: true })
				.eq('store_id', this.storeId)

			let allProducts = [];
			let chunkSize = 1000;
			for (var i = 0; i < productCount; i += chunkSize) {
				const { data: products, error: productsError } = await supabase.from('products')
					.select('product_id, sale_price, sale_quantity, product_sku_id').eq('store_id', this.storeId).range(i, i + chunkSize - 1);
				if (productsError) throw productsError;
				allProducts.push(...products)
			}
			storeProducts = storeProducts.filter(p => p.id)

			var products = []
			storeProducts.forEach((product) => {
				var originalProduct = allProducts.find(p => p.product_id == product.id)
				products.push({
					product_id: product.id,
					product_title: product.title,
					vendor: product.vendor,
					status: product.status,
					store_id: this.storeId,
					product_sku_id: product.variants.length > 0 ? product.variants[0].sku : null,
					sale_price: originalProduct ? originalProduct.sale_price : 0,
					sale_quantity: originalProduct ? originalProduct.sale_quantity : 0
				})
			})

			if (products.length > 0) {

				if (products.length > chunkSize) {
					for (let i = 0; i < products.length; i += chunkSize) {
						const chunk = products.slice(i, i + chunkSize);

						const { error: productsError } = await supabase
							.from('products')
							.upsert(chunk, {
								onConflict: 'product_id',
								ignoreDuplicates: false
							});

						if (productsError) {
							console.error(`❌ Error in products upsert chunk ${i}:`, productsError);
							throw productsError;
						}

					}
				} else {
					const { error: productsError } = await supabase
						.from('products')
						.upsert(products, {
							onConflict: 'product_id',
							ignoreDuplicates: false
						});
				}

			}

		} catch (error) {
			console.error('❌ Error fetching products:', error.message);
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
			const { count: productSkuCount } = await supabase.from("product_skus")
				.select("*", { count: 'exact', head: true })
				.eq("store_id", this.storeId)
			for (var i = 0; i < productSkuCount; i += 1000) {
				const { data: skuDatas, error: skuError } = await supabase.from("product_skus")
					.select("sku_id, product_ids").eq("store_id", this.storeId).range(i, i + 999);
				if (skuError) throw skuError;
				productSkusData.push(...skuDatas);
			}

			const { count: productsCount } = await supabase.from("products").select("*", { count: 'exact', head: true }).eq("store_id", this.storeId);
			for (var i = 0; i < productsCount; i += 1000) {
				const { data: productsDatas, error: productsError } = await supabase.from("products").select("product_id").eq("store_id", this.storeId).range(i, i + 999);
				if (productsError) throw productsError;
				productsData.push(...productsDatas);
			}

			// Transform all orders to database format
			const orderDataArray = [];
			const uniqueCustomers = new Map();

			var cIds = []
			orders.forEach((order) => {
				if (order.customer && !cIds.includes(order.customer.id.toString())) cIds.push(order.customer.id.toString())
			})

			var { count: customerCount } = await supabase
				.from('customers')
				.select('*', { count: 'exact', head: true })
				.eq('store_id', this.storeId)
				.in('customer_id', cIds);

			var chunk = 1000;
			var allCustomers = [];

			for (var i = 0; i < customerCount; i += chunk) {
				const currentChunk = Math.floor(i / chunk) + 1;

				const { data: customers, error: customersError } = await supabase
					.from('customers')
					.select('customer_id, first_order_date, first_order_product_ids, first_order_prices, first_order_id')
					.eq('store_id', this.storeId)
					.in('customer_id', cIds)
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
					var currency = common.currencyRates[order.currency] || 1;
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

						lineItem.sku = productSkusData.find(productSku => productSku.product_ids.includes(productId))?.sku_id || lineItem.sku;
						if (!uniqueProducts.has(productId)) {
							uniqueProducts.set(productId, {
								product_id: productId,
								store_id: this.storeId, // Add store ID
								product_sku_id: lineItem.sku || productId,
								product_title: lineItem.title || 'Unknown Product',
								vendor: lineItem.vendor || null,
								status: 'active',
								created_at: common.createLocalDateWithTime(new Date()).toISOString(),
								updated_at: common.createLocalDateWithTime(new Date()).toISOString()
							});
						}

						var sku = lineItem.sku.includes("-") ? lineItem.sku.split("-")[0] + "-" + lineItem.sku.split("-")[1] : lineItem.sku;
						if (!updateProductSkus.includes(sku)) {
							updateProductSkus.push(sku);
						}
						var totalPrice = parseFloat(lineItem.price || 0) * (lineItem.quantity || 1) - lineItem.total_discount;
						totalPrice = totalPrice * currency;
						var refundPrice = 0;
						if (!priceStr[productId]) {
							priceStr[productId] = 0;
						}
						if (order.financial_status == "paid") {
							priceStr[productId] += totalPrice;
						}
						if (order.financial_status == "refunded") {
							refundPrice += totalPrice;
						}
						else if (order.financial_status == "partially_refunded") {
							order.refunds.forEach(refund => {
								refund.amount = refund.amount * currency;
								if (refund.line_item_id == lineItem.id) {
									totalPrice -= refund.amount;
									refundPrice += refund.amount;
								}
							});
						}

						if (order.product_ids) {
							if (!order.product_ids.includes(productId)) {
								order.product_ids += "," + productId;
							}
						}
						else {
							order.product_ids = productId;
						}
						if (!order.financial_status) {
							order.financial_status = "unpaid";
						}

						if (this.storeId != 'meonutrition') {
							var productSku = productSkusData.find(productSku => sku.includes(productSku.sku_id));
							if (!productSku) {
								if (!uniqueProductSkus.has(sku)) {
									uniqueProductSkus.set(sku, {
										sku_id: sku,
										store_id: this.storeId,
										sku_title: lineItem.title,
										product_ids: productId
									});
								}
							}
						}
						var lineTaxAmount = 0
						if (lineItem.tax_lines && lineItem.tax_lines.length > 0) {
							lineItem.tax_lines.forEach((item) => {
								lineTaxAmount += parseFloat(item.amount || 0) * currency;
							})
						}
						// Prepare line item data
						lineItemsData.push({
							shopify_order_id: order.id.toString(),
							store_id: this.storeId,
							customer_id: order.customer ? order.customer.id.toString() : null,
							financial_status: order.financial_status,
							line_item_id: lineItem.id.toString(),
							product_id: productId,
							product_title: lineItem.title || 'Unknown Product',
							variant_id: lineItem.variant_id?.toString() || null,
							variant_title: lineItem.variant_title || null,
							sku: lineItem.sku || productId,
							quantity: lineItem.quantity || 1,
							price: parseFloat(lineItem.price || 0) * currency,
							total_price: (parseFloat(lineItem.price || 0) * (lineItem.quantity || 1) - lineItem.total_discount) * currency - lineTaxAmount - parseFloat(lineItem.total_discount || 0),
							order_country: order.shipping_address?.country || null,
							currency_symbol: order.currency ? order.currency : "USD",
							currency_rate: currency,
							refund_price: refundPrice,
							created_at: common.createLocalDateWithTime(order.created_at).toISOString()
						});
					});
				}

				if (order.customer && order.customer.id) {
					const customerId = order.customer.id.toString();
					if (!uniqueCustomers.has(customerId)) {
						// Get default address from customer
						const defaultAddress = order.customer.default_address || {};
						var customer = allCustomers.find(customer => customer.customer_id === customerId);
						var firstOrderDate = null, firstOrderProductIds = ''
						if (customer && customer.first_order_date) {
							firstOrderDate = common.createLocalDateWithTime(customer.first_order_date).toISOString()
							firstOrderProductIds = customer.first_order_product_ids
						}
						if (order.financial_status == 'paid' && (firstOrderDate == null || new Date(firstOrderDate).getTime() > new Date(order.created_at).getTime())) {
							firstOrderDate = common.createLocalDateWithTime(order.created_at).toISOString()
							firstOrderProductIds = order.product_ids
						}
						uniqueCustomers.set(customerId, {
							customer_id: customerId,
							store_id: this.storeId,
							email: order.customer.email || null,
							first_name: order.customer.first_name || null,
							last_name: order.customer.last_name || null,
							phone: order.customer.phone || null,
							orders_count: order.customer.orders_count || 0,
							total_spent: parseFloat(order.customer.total_spent || 0) * currency,
							// Address fields
							address1: defaultAddress.address1 || null,
							address2: defaultAddress.address2 || null,
							city: defaultAddress.city || null,
							province: defaultAddress.province || null,
							country: defaultAddress.country || null,
							order_country: order.shipping_address?.country || null,
							zip: defaultAddress.zip || null,
							created_at: common.createLocalDateWithTime(order.customer.created_at || order.created_at).toISOString(),
							updated_at: common.createLocalDateWithTime(order.customer.updated_at || order.updated_at).toISOString(),
							first_order_date: firstOrderDate,
							first_order_id: customer ? customer.first_order_id : order.id.toString(),
							first_order_prices: customer ? customer.first_order_prices : JSON.stringify(priceStr),
							first_order_product_ids: firstOrderProductIds
						});
					}
					else {
						if (order.financial_status == "paid") {
							if (uniqueCustomers.get(customerId).first_order_date == null || new Date(uniqueCustomers.get(customerId).first_order_date).getTime() > new Date(order.created_at).getTime()) {
								uniqueCustomers.get(customerId).first_order_date = common.createLocalDateWithTime(order.created_at).toISOString();
								uniqueCustomers.get(customerId).first_order_id = order.id.toString();
								uniqueCustomers.get(customerId).first_order_product_ids = order.product_ids;
								uniqueCustomers.get(customerId).first_order_prices = JSON.stringify(priceStr);
							}
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
				totalRefunds = totalRefunds * currency;
				orderDataArray.push({
					shopify_order_id: order.id.toString(),
					store_id: this.storeId, // Add store ID
					order_number: order.order_number,
					total_price: parseFloat(order.total_price) * currency,
					subtotal_price: parseFloat(order.subtotal_price) * currency,
					total_tax: parseFloat(order.total_tax) * currency,
					total_discounts: parseFloat(order.total_discounts) * currency,
					currency_symbol: order.currency,
					currency_rate: currency,
					financial_status: order.financial_status,
					fulfillment_status: order.fulfillment_status,
					created_at: common.createLocalDateWithTime(order.created_at).toISOString(),
					updated_at: common.createLocalDateWithTime(order.updated_at).toISOString(),
					customer_email: order.customer?.email || null,
					customer_id: order.customer?.id?.toString() || null,
					refund_price: totalRefunds,
					country: order.shipping_address?.country || null,
					saved_at: common.createLocalDateWithTime(new Date())
				})
			})

			// Extract unique products from line items and prepare for products table

			await common.initialSiteData(common, this.storeId, updateProductSkus);

			if (this.storeId != "meonutrition") {
				console.log(uniqueProductSkus.values())
				const { error: productSkusError } = await supabase.from("product_skus").upsert(Array.from(uniqueProductSkus.values()), {
					onConflict: 'sku_id',
					ignoreDuplicates: false
				});
				if (productSkusError) {
					console.error('❌ Error in product skus upsert:', productSkusError);
					throw productSkusError;
				}
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
				const date = common.createLocalDateWithTime(order.created_at).toISOString().split('T')[0];
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

			console.log(syncDate)

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
			for (const customer of customers) {
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