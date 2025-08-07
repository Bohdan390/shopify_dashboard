const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class WindsorService {
  constructor() {
    this.apiKey = process.env.WINDSOR_API_KEY;
    this.baseURL = 'https://connectors.windsor.ai';
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    if (!this.apiKey) {
      console.warn('⚠️  WINDSOR_API_KEY not found in environment variables');
    }
  }

  async fetchAdData(startDate, endDate, dataSource = 'facebook_ads') {
    try {
      if (!this.apiKey) {
        throw new Error('Windsor API key not configured');
      }

      console.log(`🔍 Fetching ${dataSource} data from Windsor.ai`);

      const response = await axios.get(`${this.baseURL}/all`, {
        params: {
          api_key: this.apiKey,
          date_from: startDate,
          date_to: endDate,
          fields: 'account_name,campaign,clicks,datasource,date,source,spend',
          _renderer: 'json'
        }
      });

      console.log(response.data.data.length)
      if (response.data && response.data.data) {
        console.log(`✅ Fetched ${response.data.data.length} records from Windsor.ai`);
        return this.processWindsorData(response.data.data, dataSource);
      } else {
        console.log('⚠️  No data returned from Windsor.ai');
        return [];
      }

    } catch (error) {
      console.error('❌ Error fetching data from Windsor.ai:', error.message);
      throw error;
    }
  }

  processWindsorData(data, dataSource) {
    return data.map(item => ({
      date: item.date,
      campaign_id: item.campaign || 'unknown',
      campaign_name: item.campaign,
      adset_id: null,
      adset_name: null,
      ad_id: null,
      ad_name: null,
      spend: parseFloat(item.spend || 0),
      impressions: 0, // Not available in this API
      clicks: parseInt(item.clicks || 0),
      conversions: 0, // Not available in this API
      conversion_value: 0, // Not available in this API
      platform: item.source === 'facebook' ? 'facebook' : 'google',
      data_source: item.datasource,
      account_name: item.account_name
    }));
  }

  async fetchFacebookAdsData(startDate, endDate) {
    return this.fetchAdData(startDate, endDate, 'facebook_ads');
  }

  async fetchGoogleAdsData(startDate, endDate) {
    return this.fetchAdData(startDate, endDate, 'google_ads');
  }

  async fetchAllAdData(startDate, endDate) {
    try {
      console.log('🔄 Fetching data from all ad platforms via Windsor.ai...');
      
      // Use the single endpoint that returns all data
      const data = await this.fetchAdData(startDate, endDate, 'all');
      
      console.log(`✅ Total records fetched: ${data.length}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching all ad data:', error.message);
      throw error;
    }
  }

  // Map campaign to store/product based on naming convention
  mapCampaignToStoreProduct(campaignName) {
    if (!campaignName) return { store_id: null, product_id: null };

    var arr = campaignName.split('_');
    var store_id = arr[0];

    if (campaignName.includes("NonBrand") || campaignName.includes("Nonbrand")) {
      
    }


    return { store_id, product_id: null };
  }

  async saveAdDataToDatabase(adData, socket = null) {
    try {
      console.log(`💾 Saving ${adData.length} ad records to database...`);
      
      // Group data by campaign for campaign table
      const campaigns = new Map();
      const adSpendRecords = [];
      
      for (const record of adData) {
        // Create campaign record
        const campaignKey = `${record.campaign_id}_${record.platform}`;
        if (!campaigns.has(campaignKey)) {
          const { store_id, product_id } = this.mapCampaignToStoreProduct(record.campaign_name);
          campaigns.set(campaignKey, {
            campaign_id: record.campaign_id,
            campaign_name: record.campaign_name,
            platform: record.platform,
            account_id: record.account_name || 'windsor_ai',
            store_id,
            product_id,
            status: 'active'
          });
        }
        
        // Create ad spend record
        const { store_id, product_id } = this.mapCampaignToStoreProduct(record.campaign_name);
        adSpendRecords.push({
          date: record.date,
          campaign_id: record.campaign_id,
          platform: record.platform,
          spend_amount: record.spend,
          impressions: record.impressions,
          clicks: record.clicks,
          conversions: record.conversions,
          conversion_value: record.conversion_value,
          store_id,
          product_id
        });
      }
      
      // Save campaigns to database
      console.log(`📊 Saving ${campaigns.size} campaigns to database...`);
      
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'saving_campaigns',
          message: `📊 Saving ${campaigns.size} campaigns to database...`,
          progress: 70,
          total: 'unlimited'
        });
      }
      
      const campaignArray = Array.from(campaigns.values());
      
      if (campaignArray.length > 0) {
        const { error: campaignError } = await this.supabase
          .from('ad_campaigns')
          .upsert(campaignArray, { 
            onConflict: 'campaign_id',
            ignoreDuplicates: false 
          });
          
        if (campaignError) {
          console.error('❌ Error saving campaigns:', campaignError);
          throw campaignError;
        }
        console.log(`✅ Saved ${campaignArray.length} campaigns`);
      }
      
      // Save ad spend data to database
      console.log(`💰 Saving ${adSpendRecords.length} ad spend records to database...`);
      
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'saving_spend',
          message: `💰 Saving ${adSpendRecords.length} ad spend records to database...`,
          progress: 85,
          total: 'unlimited'
        });
      }
      
      if (adSpendRecords.length > 0) {
        // Save to ad_spend_detailed table
        const { error: spendError } = await this.supabase
          .from('ad_spend_detailed')
          .upsert(adSpendRecords, { 
            onConflict: 'date,campaign_id,platform',
            ignoreDuplicates: false 
          });
          
        if (spendError) {
          console.error('❌ Error saving ad spend detailed data:', spendError);
          throw spendError;
        }
        console.log(`✅ Saved ${adSpendRecords.length} ad spend detailed records`);
      }
      
      console.log(`🎉 Successfully saved all Windsor.ai data to database!`);
      return {
        campaignsSaved: campaignArray.length,
        adSpendRecordsSaved: adSpendRecords.length
      };
      
    } catch (error) {
      console.error('❌ Error saving Windsor.ai data to database:', error);
      throw error;
    }
  }

  async fetchAndSaveAdData(startDate, endDate, socket = null) {
    try {
      console.log('🔄 Fetching and saving Windsor.ai ad data...');
      
      // Emit initial progress
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'starting',
          message: '🔄 Starting Windsor.ai ads sync...',
          progress: 0,
          total: 'unlimited'
        });
      }
      
      // Fetch data from Windsor.ai
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'fetching',
          message: '📥 Fetching ad data from Windsor.ai...',
          progress: 20,
          total: 'unlimited'
        });
      }
      
      const adData = await this.fetchAllAdData(startDate, endDate);
      
      if (adData.length === 0) {
        console.log('⚠️  No ad data to save');
        if (socket) {
          socket.emit('adsSyncProgress', {
            stage: 'completed',
            message: '⚠️  No ad data found for the specified date range',
            progress: 100,
            total: 'unlimited',
            campaignsSaved: 0,
            adSpendRecordsSaved: 0
          });
        }
        return { campaignsSaved: 0, adSpendRecordsSaved: 0 };
      }
      
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'saving',
          message: `💾 Saving ${adData.length} ad records to database...`,
          progress: 60,
          total: 'unlimited'
        });
      }
      
      // Save to database
      const result = await this.saveAdDataToDatabase(adData, socket);
      
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'sync_completed',
          message: '✅ Windsor.ai ads sync completed! Starting analytics recalculation...',
          progress: 90,
          total: 'unlimited',
          campaignsSaved: result.campaignsSaved,
          adSpendRecordsSaved: result.adSpendRecordsSaved
        });
      }
      
      console.log(`✅ Windsor.ai sync completed!`);
      console.log(`📊 Campaigns saved: ${result.campaignsSaved}`);
      console.log(`💰 Ad spend records saved: ${result.adSpendRecordsSaved}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in Windsor.ai fetch and save:', error);
      
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'error',
          message: `❌ Error syncing ads: ${error.message}`,
          progress: 0,
          total: 'unlimited',
          error: error.message
        });
      }
      
      throw error;
    }
  }
}

module.exports = new WindsorService();