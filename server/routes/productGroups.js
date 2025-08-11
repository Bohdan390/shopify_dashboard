const express = require('express');
const router = express.Router();
const ProductGroupingService = require('../services/productGroupingService');

const productGroupingService = new ProductGroupingService();

// Get all product groups for a store
router.get('/groups', async (req, res) => {
	try {
		const { storeId = 'buycosari' } = req.query;
		console.log(`📊 Fetching product groups for store: ${storeId}`);

		const groups = await productGroupingService.getProductGroups(storeId);
		res.json(groups);
	} catch (error) {
		console.error('❌ Error fetching product groups:', error);
		res.status(500).json({ error: 'Failed to fetch product groups' });
	}
});

// Get product group mappings for a store
router.get('/mappings', async (req, res) => {
	try {
		const { storeId = 'buycosari' } = req.query;
		console.log(`📊 Fetching product group mappings for store: ${storeId}`);

		const mappings = await productGroupingService.getProductGroupMappings(storeId);
		res.json(mappings);
	} catch (error) {
		console.error('❌ Error fetching product group mappings:', error);
		res.status(500).json({ error: 'Failed to fetch product group mappings' });
	}
});

// Auto-group products based on SKU patterns
router.post('/auto-group', async (req, res) => {
	try {
		const { storeId = 'buycosari' } = req.body;
		console.log(`🔄 Auto-grouping products for store: ${storeId}`);

		const result = await productGroupingService.autoGroupProducts(storeId);
		res.json({
			message: 'Products auto-grouped successfully',
			groups: result
		});
	} catch (error) {
		console.error('❌ Error auto-grouping products:', error);
		res.status(500).json({ error: 'Failed to auto-group products' });
	}
});

// Create a product group manually
router.post('/groups', async (req, res) => {
	try {
		const { storeId, mainProductName, mainProductSku } = req.body;
		console.log(`➕ Creating product group: ${mainProductName} for store: ${storeId}`);

		const result = await productGroupingService.createProductGroup(storeId, mainProductName, mainProductSku);
		res.json(result);
	} catch (error) {
		console.error('❌ Error creating product group:', error);
		res.status(500).json({ error: 'Failed to create product group' });
	}
});

// Map a product to a group
router.post('/mappings', async (req, res) => {
	try {
		const { storeId, mainProductSku, individualSku, individualProductTitle } = req.body;
		console.log(`🔗 Mapping product ${individualSku} to group ${mainProductSku} for store: ${storeId}`);

		const result = await productGroupingService.mapProductToGroup(
			storeId,
			mainProductSku,
			individualSku,
			individualProductTitle
		);
		res.json(result);
	} catch (error) {
		console.error('❌ Error mapping product to group:', error);
		res.status(500).json({ error: 'Failed to map product to group' });
	}
});

// Calculate profit for a specific product group
router.get('/profit/:mainProductSku', async (req, res) => {
	try {
		const { mainProductSku } = req.params;
		const { storeId = 'buycosari', startDate, endDate } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		console.log(`💰 Calculating profit for ${mainProductSku} from ${startDate} to ${endDate} for store: ${storeId}`);

		const profit = await productGroupingService.calculateProductGroupProfit(
			storeId,
			mainProductSku,
			startDate,
			endDate
		);
		res.json(profit);
	} catch (error) {
		console.error('❌ Error calculating product group profit:', error);
		res.status(500).json({ error: 'Failed to calculate product group profit' });
	}
});

// Calculate LTV for a specific product group
router.get('/ltv/:mainProductSku', async (req, res) => {
	try {
		const { mainProductSku } = req.params;
		const { storeId = 'buycosari' } = req.query;

		console.log(`👥 Calculating LTV for ${mainProductSku} for store: ${storeId}`);

		const ltv = await productGroupingService.calculateProductGroupLTV(storeId, mainProductSku);
		res.json(ltv);
	} catch (error) {
		console.error('❌ Error calculating product group LTV:', error);
		res.status(500).json({ error: 'Failed to calculate product group LTV' });
	}
});

// Get comprehensive analytics for all product groups
router.get('/analytics', async (req, res) => {
	try {
		const { storeId = 'buycosari', startDate, endDate } = req.query;

		if (!startDate || !endDate) {
			return res.status(400).json({ error: 'startDate and endDate are required' });
		}

		console.log(`📊 Getting product group analytics from ${startDate} to ${endDate} for store: ${storeId}`);

		const analytics = await productGroupingService.getProductGroupAnalytics(storeId, startDate, endDate);
		res.json(analytics);
	} catch (error) {
		console.error('❌ Error getting product group analytics:', error);
		res.status(500).json({ error: 'Failed to get product group analytics' });
	}
});

module.exports = router;
