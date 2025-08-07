const axios = require('axios');
const { supabase } = require('../config/database-supabase');

class GoogleAdsService {
	constructor() {
		this.baseURL = 'https://googleads.googleapis.com/v14';
		this.accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;
		this.customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
		this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
	}

	async fetchCampaigns(socket = null) {
		try {
			console.log('📘 Fetching Google Ads campaigns...');

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'fetching_google',
					message: '📘 Fetching Google Ads campaigns...',
					progress: 10,
					total: 'unlimited'
				});
			}

			const url = `${this.baseURL}/customers/${this.customerId}/googleAds:search`;
			const headers = {
				'Authorization': `Bearer ${this.accessToken}`,
				'developer-token': this.developerToken,
				'Content-Type': 'application/json'
			};

			const query = `
				SELECT 
					campaign.id,
					campaign.name,
					campaign.status,
					campaign.start_date,
					campaign.end_date
				FROM campaign 
				WHERE campaign.status IN ('ENABLED', 'PAUSED')
			`;

			const response = await axios.post(url, { query }, { headers });
			const campaigns = response.data.results || [];

			console.log(`✅ Fetched ${campaigns.length} Google Ads campaigns`);

			// Save campaigns to database
			await this.saveCampaigns(campaigns, socket);

			return campaigns;
		} catch (error) {
			console.error('❌ Error fetching Google Ads campaigns:', error.message);
			if (error.response) {
				console.error('Response status:', error.response.status);
				console.error('Response data:', error.response.data);
			}
			throw error;
		}
	}

	async saveCampaigns(campaigns, socket = null) {
		try {
			console.log(`💾 Saving ${campaigns.length} Google Ads campaigns to database...`);

			const campaignData = campaigns.map(campaign => ({
				campaign_id: campaign.campaign.id,
				campaign_name: campaign.campaign.name,
				platform: 'google',
				account_id: this.customerId,
				status: campaign.campaign.status.toLowerCase(),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}));

			// Delete existing campaigns for this account
			const { error: deleteError } = await supabase
				.from('ad_campaigns')
				.delete()
				.eq('platform', 'google')
				.eq('account_id', this.customerId);

			if (deleteError) {
				console.error('❌ Error deleting existing Google Ads campaigns:', deleteError);
				throw deleteError;
			}

			// Insert new campaigns
			const { error: insertError } = await supabase
				.from('ad_campaigns')
				.insert(campaignData);

			if (insertError) {
				console.error('❌ Error inserting Google Ads campaigns:', insertError);
				throw insertError;
			}

			console.log(`✅ Saved ${campaigns.length} Google Ads campaigns`);
		} catch (error) {
			console.error('Error saving Google Ads campaigns:', error);
			throw error;
		}
	}

	async fetchAdSpend(startDate, endDate, socket = null) {
		try {
			console.log(`📊 Fetching Google Ads spend from ${startDate} to ${endDate}...`);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'fetching_google_spend',
					message: '📊 Fetching Google Ads spend data...',
					progress: 20,
					total: 'unlimited'
				});
			}

			const url = `${this.baseURL}/customers/${this.customerId}/googleAds:search`;
			const headers = {
				'Authorization': `Bearer ${this.accessToken}`,
				'developer-token': this.developerToken,
				'Content-Type': 'application/json'
			};

			const query = `
				SELECT 
					campaign.id,
					campaign.name,
					segments.date,
					metrics.cost_micros,
					metrics.impressions,
					metrics.clicks,
					metrics.conversions,
					metrics.conversions_value
				FROM customer 
				WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
				AND campaign.status IN ('ENABLED', 'PAUSED')
			`;

			const response = await axios.post(url, { query }, { headers });
			const insights = response.data.results || [];

			console.log(`✅ Fetched ${insights.length} Google Ads spend records`);

			// Save ad spend data
			await this.saveAdSpend(insights, socket);

			return insights;
		} catch (error) {
			console.error('❌ Error fetching Google Ads spend:', error.message);
			if (error.response) {
				console.error('Response status:', error.response.status);
				console.error('Response data:', error.response.data);
			}
			throw error;
		}
	}

	async saveAdSpend(insights, socket = null) {
		try {
			console.log(`💾 Saving ${insights.length} Google Ads spend records...`);

			const adSpendData = [];

			for (const insight of insights) {
				// Convert cost from micros to dollars
				const spendAmount = parseFloat(insight.metrics.cost_micros) / 1000000;

				// Map campaign to store/product based on campaign name
				const { storeId, productId } = this.mapCampaignToStoreProduct(insight.campaign.name);

				adSpendData.push({
					date: insight.segments.date,
					campaign_id: insight.campaign.id,
					platform: 'google',
					spend_amount: spendAmount,
					impressions: parseInt(insight.metrics.impressions) || 0,
					clicks: parseInt(insight.metrics.clicks) || 0,
					conversions: parseFloat(insight.metrics.conversions) || 0,
					conversion_value: parseFloat(insight.metrics.conversions_value) || 0,
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
					.eq('platform', 'google')
					.gte('date', startDate)
					.lte('date', endDate);

				if (deleteError) {
					console.error('❌ Error deleting existing Google Ads spend:', deleteError);
					throw deleteError;
				}
			}

			// Insert new ad spend data
			const { error: insertError } = await supabase
				.from('ad_spend_detailed')
				.insert(adSpendData);

			if (insertError) {
				console.error('❌ Error inserting Google Ads spend:', insertError);
				throw insertError;
			}

			console.log(`✅ Saved ${adSpendData.length} Google Ads spend records`);
		} catch (error) {
			console.error('Error saving Google Ads spend:', error);
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
		// "Google Store B Product Y" -> store: "store_b", product: "product_y"
		
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

	async syncGoogleAds(startDate, endDate, socket = null) {
		try {
			console.log('🔄 Starting Google Ads sync...');

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'starting_google',
					message: '🔄 Starting Google Ads sync...',
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
					stage: 'completed_google',
					message: '✅ Google Ads sync completed!',
					progress: 100,
					total: 'unlimited'
				});
			}

			console.log('✅ Google Ads sync completed');
		} catch (error) {
			console.error('❌ Error syncing Google Ads:', error);

			if (socket) {
				socket.emit('syncProgress', {
					stage: 'error_google',
					message: `❌ Google Ads sync error: ${error.message}`,
					progress: 0,
					total: 'unlimited',
					error: error.message
				});
			}

			throw error;
		}
	}
}

module.exports = new GoogleAdsService(); 