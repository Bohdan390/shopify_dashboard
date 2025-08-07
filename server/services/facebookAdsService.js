const axios = require('axios');
const { supabase } = require('../config/database-supabase');

class FacebookAdsService {
	constructor() {
		this.baseURL = 'https://graph.facebook.com/v18.0';
		this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
		this.adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
	}

	async fetchCampaigns(socket = null) {
		try {
			console.log('📘 Fetching Facebook Ads campaigns...');

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'fetching_facebook',
					message: '📘 Fetching Facebook Ads campaigns...',
					progress: 10,
					total: 'unlimited'
				});
			}

			const url = `${this.baseURL}/${this.adAccountId}/campaigns`;
			const params = {
				access_token: this.accessToken,
				fields: 'id,name,status,objective,created_time,updated_time',
				limit: 1000
			};

			const response = await axios.get(url, { params });
			const campaigns = response.data.data;

			console.log(`✅ Fetched ${campaigns.length} Facebook campaigns`);

			// Save campaigns to database
			await this.saveCampaigns(campaigns, socket);

			return campaigns;
		} catch (error) {
			console.error('❌ Error fetching Facebook campaigns:', error.message);
			if (error.response) {
				console.error('Response status:', error.response.status);
				console.error('Response data:', error.response.data);
			}
			throw error;
		}
	}

	async saveCampaigns(campaigns, socket = null) {
		try {
			console.log(`💾 Saving ${campaigns.length} Facebook campaigns to database...`);

			const campaignData = campaigns.map(campaign => ({
				campaign_id: campaign.id,
				campaign_name: campaign.name,
				platform: 'facebook',
				account_id: this.adAccountId,
				status: campaign.status,
				created_at: new Date(campaign.created_time).toISOString(),
				updated_at: new Date(campaign.updated_time).toISOString()
			}));

			// Delete existing campaigns for this account
			const { error: deleteError } = await supabase
				.from('ad_campaigns')
				.delete()
				.eq('platform', 'facebook')
				.eq('account_id', this.adAccountId);

			if (deleteError) {
				console.error('❌ Error deleting existing Facebook campaigns:', deleteError);
				throw deleteError;
			}

			// Insert new campaigns
			const { error: insertError } = await supabase
				.from('ad_campaigns')
				.insert(campaignData);

			if (insertError) {
				console.error('❌ Error inserting Facebook campaigns:', insertError);
				throw insertError;
			}

			console.log(`✅ Saved ${campaigns.length} Facebook campaigns`);
		} catch (error) {
			console.error('Error saving Facebook campaigns:', error);
			throw error;
		}
	}

	async fetchAdSpend(startDate, endDate, socket = null) {
		try {
			console.log(`📊 Fetching Facebook ad spend from ${startDate} to ${endDate}...`);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'fetching_facebook_spend',
					message: '📊 Fetching Facebook ad spend data...',
					progress: 20,
					total: 'unlimited'
				});
			}

			const url = `${this.baseURL}/${this.adAccountId}/insights`;
			const params = {
				access_token: this.accessToken,
				fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,date_start,date_stop',
				time_range: {
					since: startDate,
					until: endDate
				},
				time_increment: 1, // Daily breakdown
				limit: 1000
			};

			const response = await axios.get(url, { params });
			const insights = response.data.data;

			console.log(`✅ Fetched ${insights.length} Facebook ad spend records`);

			// Save ad spend data
			await this.saveAdSpend(insights, socket);

			return insights;
		} catch (error) {
			console.error('❌ Error fetching Facebook ad spend:', error.message);
			if (error.response) {
				console.error('Response status:', error.response.status);
				console.error('Response data:', error.response.data);
			}
			throw error;
		}
	}

	async saveAdSpend(insights, socket = null) {
		try {
			console.log(`💾 Saving ${insights.length} Facebook ad spend records...`);

			const adSpendData = [];

			for (const insight of insights) {
				// Parse actions to get conversions
				let conversions = 0;
				let conversionValue = 0;

				if (insight.actions) {
					const purchaseAction = insight.actions.find(action => 
						action.action_type === 'purchase' || 
						action.action_type === 'offsite_conversion'
					);
					if (purchaseAction) {
						conversions = parseInt(purchaseAction.value) || 0;
					}
				}

				if (insight.action_values) {
					const purchaseValue = insight.action_values.find(action => 
						action.action_type === 'purchase' || 
						action.action_type === 'offsite_conversion'
					);
					if (purchaseValue) {
						conversionValue = parseFloat(purchaseValue.value) || 0;
					}
				}

				// Map campaign to store/product based on campaign name
				const { storeId, productId } = this.mapCampaignToStoreProduct(insight.campaign_name);

				adSpendData.push({
					date: insight.date_start,
					campaign_id: insight.campaign_id,
					platform: 'facebook',
					spend_amount: parseFloat(insight.spend),
					impressions: parseInt(insight.impressions) || 0,
					clicks: parseInt(insight.clicks) || 0,
					conversions: conversions,
					conversion_value: conversionValue,
					store_id: storeId,
					product_id: productId
				});
			}

			// Delete existing ad spend data for the date range
			if (adSpendData.length > 0) {
				const startDate = adSpendData[0].date;
				const endDate = adSpendData[adSpendData.length - 1].date;

				const { error: deleteError } = await supabase
					.from('ad_spend_detailed')
					.delete()
					.eq('platform', 'facebook')
					.gte('date', startDate)
					.lte('date', endDate);

				if (deleteError) {
					console.error('❌ Error deleting existing Facebook ad spend:', deleteError);
					throw deleteError;
				}
			}

			// Insert new ad spend data
			const { error: insertError } = await supabase
				.from('ad_spend_detailed')
				.insert(adSpendData);

			if (insertError) {
				console.error('❌ Error inserting Facebook ad spend:', insertError);
				throw insertError;
			}

			console.log(`✅ Saved ${adSpendData.length} Facebook ad spend records`);
		} catch (error) {
			console.error('Error saving Facebook ad spend:', error);
			throw error;
		}
	}

	mapCampaignToStoreProduct(campaignName) {
		// This is where you implement your mapping logic
		// You can use regex patterns, keyword matching, or a mapping table
		
		// Example mapping logic (customize based on your campaign naming conventions)
		const name = campaignName.toLowerCase();
		
		// Example patterns:
		// "Store A - Product X" -> store: "store_a", product: "product_x"
		// "FB Store B Product Y" -> store: "store_b", product: "product_y"
		
		let storeId = null;
		let productId = null;

		// Add your specific mapping logic here
		// This is just an example - you'll need to customize based on your campaign names
		if (name.includes('store a') || name.includes('store_a')) {
			storeId = 'store_a';
		} else if (name.includes('store b') || name.includes('store_b')) {
			storeId = 'store_b';
		}

		if (name.includes('product x') || name.includes('product_x')) {
			productId = 'product_x';
		} else if (name.includes('product y') || name.includes('product_y')) {
			productId = 'product_y';
		}

		return { storeId, productId };
	}

	async syncFacebookAds(startDate, endDate, socket = null) {
		try {
			console.log('🔄 Starting Facebook Ads sync...');

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'starting_facebook',
					message: '🔄 Starting Facebook Ads sync...',
					progress: 0,
					total: 'unlimited'
				});
			}

			// Fetch and save campaigns
			await this.fetchCampaigns(socket);

			// Fetch and save ad spend data
			await this.fetchAdSpend(startDate, endDate, socket);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'completed_facebook',
					message: '✅ Facebook Ads sync completed!',
					progress: 100,
					total: 'unlimited'
				});
			}

			console.log('✅ Facebook Ads sync completed');
		} catch (error) {
			console.error('❌ Error syncing Facebook Ads:', error);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'error_facebook',
					message: `❌ Facebook Ads sync error: ${error.message}`,
					progress: 0,
					total: 'unlimited',
					error: error.message
				});
			}

			throw error;
		}
	}
}

module.exports = new FacebookAdsService(); 