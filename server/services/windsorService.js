const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const common = require("../config/common")
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

  async fetchAdData(startDate, endDate, dataSource = 'facebook_ads', storeId = null) {
    try {
      if (!this.apiKey) {
        throw new Error('Windsor API key not configured');
      }

      console.log(`🔍 Fetching ${dataSource} data from Windsor.ai`);

      var query = {}
      if (storeId == "meonutrition") {
        query = {select_accounts: "google_ads__912-676-2735"}
      }
      else if (storeId == "buycosari") {
        query = {select_accounts: "google_ads__102-337-4754"}
      }
      else if (storeId == "cosara") {
        query = {select_accounts: "google_ads__917-538-6903"}
      }
      else if (storeId == "nomobark") {
        query = {select_accounts: "google_ads__150-979-2980"}
      }
      else if (storeId == "dermao") {
        query = {select_accounts: "google_ads__973-401-9827"}
      }
      else if (storeId == "gamoseries") {
        query = {select_accounts: "google_ads__102-337-4754"}
      }
      // facebook__2024454474573344
      console.log(startDate, endDate);
      if (common.createLocalDateWithTime(startDate).getTime() > new Date().getTime()) {
        startDate = new Date().toISOString().split("T")[0]
      }
      if (startDate === endDate) {
        query = {...query, date_from: startDate}
      }
      else {
        query = {...query, date_from: startDate, date_to: endDate}
      }
      const response = await axios.get(`${this.baseURL}/all`, {
        params: {
          api_key: this.apiKey,
          ...query,
          fields: 'account_name,campaign,clicks,datasource,date,source,spend',
          _renderer: 'json'
        }
      });

      if (response.data && response.data.data) {
        var data = response.data.data
        if (storeId == "gamoseries") {
          data = data.filter(item => item.campaign && item.campaign.toLowerCase().includes("gamoseries"));
        }
        var campaignNames = data.map(item => item.campaign);

        const {data: campaignLinks} = await this.supabase.from("product_campaign_links").select("campaign_name, product_sku").in("campaign_name", campaignNames);
        if (campaignLinks.length > 0) {
          var productSkus = campaignLinks.map(item => item.product_sku);
          if (productSkus.length > 0) {
            await this.supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")}).eq('store_id', storeId).in('product_sku', productSkus);
          }
        }

        console.log(`✅ Fetched ${data.length} records from Windsor.ai`);
        return this.processWindsorData(data, dataSource);
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

  async fetchAllAdData(startDate, endDate, storeId) {
    try {
      console.log('🔄 Fetching data from all ad platforms via Windsor.ai...');
      
      // Use the single endpoint that returns all data
      const data = await this.fetchAdData(startDate, endDate, 'all', storeId);
      
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

    return { store_id, product_id: null };
  }

  async saveAdDataToDatabase(adData, socket = null, storeId = null) {
    try {
      console.log(`💾 Saving ${adData.length} ad records to database for store: ${storeId || 'all stores'}...`);
      
      // Group data by campaign for campaign table
      const campaigns = new Map();
      const adSpendRecords = [];
      
      for (const record of adData) {
        // Create campaign record
        const campaignKey = `${record.campaign_id}_${record.platform}`;
        if (!campaigns.has(campaignKey)) {
          campaigns.set(campaignKey, {
            campaign_id: record.campaign_id,
            campaign_name: record.campaign_name,
            platform: record.platform,
            account_id: record.account_name || 'windsor_ai',
            store_id: storeId || record.account_name,
            product_id: null,
            status: 'active'
          });
        }
        
        // Create ad spend record
        adSpendRecords.push({
          date: record.date,
          campaign_id: record.campaign_id,
          platform: record.platform,
          spend_amount: record.spend,
          impressions: record.impressions,
          clicks: record.clicks,
          conversions: record.conversions,
          conversion_value: record.conversion_value,
          store_id: storeId || record.account_name,
          product_id: null
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
        // Save campaigns to database in chunks
        const chunkSize = 1000; // Supabase limit
        const chunks = [];
        
        for (let i = 0; i < campaignArray.length; i += chunkSize) {
          chunks.push(campaignArray.slice(i, i + chunkSize));
        }
        
        console.log(`📦 Processing ${campaignArray.length} campaigns in ${chunks.length} chunks...`);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`💾 Saving campaign chunk ${i + 1}/${chunks.length} (${chunk.length} campaigns)...`);
          
          const { error: campaignError } = await this.supabase
            .from('ad_campaigns')
            .upsert(chunk, { 
              onConflict: 'campaign_id',
              ignoreDuplicates: false 
            });
            
          if (campaignError) {
            console.error(`❌ Error saving campaign chunk ${i + 1}:`, campaignError);
            throw campaignError;
          }
          
          console.log(`✅ Saved campaign chunk ${i + 1}/${chunks.length} (${chunk.length} campaigns)`);
        }
        
        console.log(`✅ Saved all ${campaignArray.length} campaigns`);
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
        // Save to ad_spend_detailed table in chunks
        const chunkSize = 1000; // Supabase limit
        const chunks = [];
        
        for (let i = 0; i < adSpendRecords.length; i += chunkSize) {
          chunks.push(adSpendRecords.slice(i, i + chunkSize));
        }
        
        console.log(`📦 Processing ${adSpendRecords.length} records in ${chunks.length} chunks...`);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`💾 Saving chunk ${i + 1}/${chunks.length} (${chunk.length} records)...`);
          
          if (socket) {
            socket.emit('adsSyncProgress', {
              stage: 'saving_spend_chunk',
              message: `💾 Saving chunk ${i + 1}/${chunks.length} (${chunk.length} records)...`,
              progress: 85 + (i / chunks.length) * 10,
              total: 'unlimited'
            });
          }
          
          const { error: spendError } = await this.supabase
            .from('ad_spend_detailed')
            .upsert(chunk, { 
              onConflict: 'date,campaign_id,platform',
              ignoreDuplicates: false 
            });
            
          if (spendError) {
            console.error(`❌ Error saving ad spend chunk ${i + 1}:`, spendError);
            throw spendError;
          }
          
          console.log(`✅ Saved chunk ${i + 1}/${chunks.length} (${chunk.length} records)`);
        }
        
        console.log(`✅ Saved all ${adSpendRecords.length} ad spend detailed records`);
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

  async fetchAndSaveAdData(startDate, endDate, socket = null, storeId = null) {
    try {
      console.log(`🔄 Fetching and saving Windsor.ai ad data for store: ${storeId || 'all stores'}...`);
      
      // Emit initial progress
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'starting',
          message: `🔄 Starting Windsor.ai ads sync for ${storeId || 'all stores'}...`,
          progress: 0,
          total: 'unlimited'
        });
      }
      
      // Fetch data from Windsor.ai
      if (socket) {
        socket.emit('adsSyncProgress', {
          stage: 'fetching',
          message: `📥 Fetching ad data from Windsor.ai for ${storeId || 'all stores'}...`,
          progress: 20,
          total: 'unlimited'
        });
      }
      
      const adData = await this.fetchAllAdData(startDate, endDate, storeId);
      
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
      const result = await this.saveAdDataToDatabase(adData, socket, storeId);
      
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