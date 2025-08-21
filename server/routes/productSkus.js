const express = require('express');
const router = express.Router();
const common = require('../config/common');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Get all product SKUs for a store
router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, pageSize = 20, search = '', sortBy = 'sale_price', sortDirection = 'asc' } = req.query;

    var chunk  = 1000;

    // const {count: totalCount} = await supabase.from("order_line_items").select("*", { count: 'exact', head: true }).eq("store_id", storeId);

    // var allOrderLineItems = [];
    // for (let i = 0; i < totalCount; i += chunk; i++) {
    //     const { data, error } = await supabase.from("order_line_items").select("*").eq("store_id", storeId).range(i, i + chunk - 1);
    //     allOrderLineItems.push(...data);
    // }

    // var productSkus = new Map()
    // for (let i = 0; i < allOrderLineItems.length; i++) {
    //     const orderLineItem = allOrderLineItems[i];
    //     var sku = orderLineItem.sku;
    //     if (sku.includes("-")) {
    //         sku = sku.split("-")[0] + "-" + sku.split("-")[1];
    //     }
    //     if (!productSkus.has(sku)) {
    //         productSkus.set(sku, {
    //             sku_id: sku,
    //             sku_title: common.extractProductSku(orderLineItem.product_title),
    //             product_ids: orderLineItem.product_id,
    //             store_id: orderLineItem.store_id,
    //             created_at: common.createLocalDateWithTime(new Date()),
    //             updated_at: common.createLocalDateWithTime(new Date())
    //         });
    //     } else {
    //         if (common.hasNumberX(orderLineItem.product_title)) {
    //             productSkus.get(sku).sku_title = common.extractProductSku(orderLineItem.product_title);
    //         }
    //         if (!productSkus.get(sku).product_ids.includes(orderLineItem.product_id)) {
    //             productSkus.get(sku).product_ids += "," + orderLineItem.product_id;
    //         }
    //     }
    // }

    // await supabase.from("product_skus").insert(Array.from(productSkus.values()));
    // console.log(123)
    // return;
    
    let query = supabase
      .from('product_skus')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    // Add search functionality
    if (search) {
      query = query.or(`sku_id.ilike.%${search}%,sku_title.ilike.%${search}%,product_ids.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('product_skus')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId);

    var allProductSkus = []
    var startDate = '2023-01-01';
    var endDate = '2025-12-31';
    if (common.productSkus.length == 0) {
        const { data, error } = await supabase.rpc('get_product_sku_revenue', {
            p_store_id: storeId,
            p_start_date: startDate,
            p_end_date: endDate,
        });

        if (error) throw error;
        allProductSkus.push(...data)

        var productSkus = [];

        allProductSkus.forEach(product => {
            if (!productSkus.includes(product.sku_id)) {
                productSkus.push(product.sku_id);
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

        const {count: costOfGoodsSoldCount} = await supabase.from("cost_of_goods_sold").select("*", { count: 'exact', head: true }).eq("store_id", storeId);
        var costOfGoodsSold = [];
        for (var i = 0; i < costOfGoodsSoldCount; i += chunk) {
            const { data: costOfGoodsSoldData, error: costOfGoodsSoldError } = await supabase.from("cost_of_goods_sold").select("*").eq("store_id", storeId).range(i, i + chunk - 1);
            if (costOfGoodsSoldError) throw costOfGoodsSoldError;
            costOfGoodsSold.push(...costOfGoodsSoldData);
        }

        var campaignNames = allProductCampaignLinks.map(link => link.campaign_id);

        const { data: adSpend, error: adSpendError } = await supabase
        .rpc('aggregate_ad_spend_by_campaign', {
            start_date: startDate + 'T00:00:00',
            end_date: endDate + 'T23:59:59.999',
            p_campaign_names: campaignNames
        });

        allProductSkus.forEach(product => {
            var linkedCampaigns = allProductCampaignLinks.filter(link => link.product_sku == product.sku_id);
            if (!product.total_profit) product.total_profit = product.total_revenue;
            if (!product.ad_spend) product.ad_spend = 0;
            if (!product.cost_of_goods) product.cost_of_goods = 0;
            linkedCampaigns.forEach(link => {
                var campaign = adSpend.find(item => item.campaign_id == link.campaign_id);
                product.total_profit -= campaign.total_spend;
                product.ad_spend += campaign.total_spend;
            });
            costOfGoodsSold.forEach(cost => {
                if (product.product_ids.includes(cost.product_id)) {
                    product.cost_of_goods += cost.total_cost;
                    product.total_profit -= cost.total_cost;
                }
            });
            product.roi_percentage = product.total_revenue > 0 ? (product.total_profit / product.total_revenue) * 100 : 0;
            product.roi_percentage = common.roundPrice(product.roi_percentage);
        });

        common.productSkus.push(...allProductSkus);
    }
    else {
        allProductSkus.push(...common.productSkus);
    }

    if (search) {
        allProductSkus = allProductSkus.filter(sku => sku.sku_id.includes(search) || sku.sku_title.includes(search) || sku.product_ids.includes(search));
    }

    var totalRevenue = 0;
    var totalProfit = 0;
    var totalQuantity = 0;
    allProductSkus.forEach((product) => {
        totalRevenue += product.total_revenue;
        totalProfit += product.total_profit;
        totalQuantity += product.total_quantity;
    })
    var avgOrderValue = totalRevenue / totalQuantity;

    // Apply server-side sorting
    allProductSkus.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        // Handle numeric values (including linked_campaigns_count)
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // Handle string values
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
            if (sortDirection === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        }
        
        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
        if (bValue == null) return sortDirection === 'asc' ? 1 : -1;
        
        return 0;
    });

    // Apply pagination after sorting
    allProductSkus = allProductSkus.slice((page - 1) * pageSize, page * pageSize);

    // Fetch linked campaigns count for each SKU
    // Apply pagination
    res.json({
      success: true,
      data: allProductSkus,
      totalRevenue: common.roundPrice(totalRevenue),
      totalProfit: common.roundPrice(totalProfit),
      totalQuantity: totalQuantity,
      avgOrderValue: common.roundPrice(avgOrderValue),
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(pageSize),
        totalItems: count,
        totalPages: Math.ceil(count / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching product SKUs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product SKUs',
      error: error.message
    });
  }
});

// Create new product SKU link
router.post('/', async (req, res) => {
  try {
    const { store_id, product_ids, sku_id, sku_title } = req.body;

    // Validate required fields
    if (!store_id || !sku_id || !sku_title) {
      return res.status(400).json({
        success: false,
        message: 'store_id, sku_id, and sku_title are required'
      });
    }

    // Check if SKU already exists for this store
    const { data: existing } = await supabase
      .from('product_skus')
      .select('id')
      .eq('store_id', store_id)
      .eq('sku_id', sku_id)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'SKU ID already exists for this store'
      });
    }

    const { data, error } = await supabase
      .from('product_skus')
      .insert([{
        store_id,
        product_ids: product_ids || '',
        sku_id,
        sku_title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Product SKU link created successfully',
      data
    });
  } catch (error) {
    console.error('Error creating product SKU link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product SKU link',
      error: error.message
    });
  }
});

let productSkus = [];
// Update product SKU link
router.put('/:id', async (req, res) => {
  try {
    const { product_ids, sku_id, sku_title } = req.body;

    // Check if record exists
    const { data: existing } = await supabase
      .from('product_skus')
      .select('*')
      .eq('sku_id', sku_id)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Product SKU link not found'
      });
    }

    // Check if new SKU ID conflicts with existing ones (excluding current record)
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (product_ids !== undefined) updateData.product_ids = product_ids;
    if (sku_title !== undefined) updateData.sku_title = sku_title;

    const { data, error } = await supabase
      .from('product_skus')
      .update(updateData)
      .eq('sku_id', sku_id)
      .select()
      .single();

    await supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")}).eq("product_sku", sku_id);
    common.productSkus = [];

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product SKU link updated successfully',
      data
    });
  } catch (error) {
    console.error('Error updating product SKU link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product SKU link',
      error: error.message
    });
  }
});

// Delete product SKU link
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('product_skus')
      .delete()
      .eq('id', id);

    await supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")}).eq("product_sku", id);
    common.productSkus = [];

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product SKU link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product SKU link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product SKU link',
      error: error.message
    });
  }
});

// Bulk update product SKUs (RPC function)
router.post('/bulk-update', async (req, res) => {
  try {
    const { store_id, updates } = req.body;

    if (!store_id || !updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'store_id and updates array are required'
      });
    }

    // Process updates in batches
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('product_skus')
        .upsert(batch.map(update => ({
          ...update,
          store_id,
          updated_at: new Date().toISOString()
        })), {
          onConflict: 'id'
        });

      if (error) throw error;
      results.push(...(data || []));
    }

    res.json({
      success: true,
      message: `Successfully updated ${results.length} product SKU links`,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating product SKUs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update product SKUs',
      error: error.message
    });
  }
});

module.exports = router;
