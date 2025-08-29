const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const common = require("../config/common")
const analyticsService = require('../services/analyticsService');
require('dotenv').config();

class WindsorService {
  constructor() {
    this.apiKey = process.env.WINDSOR_API_KEY;
    this.trafficJunkyApiKey = process.env.TRAFFIC_JUNKY_API_KEY;
    this.exoClickApiKey = process.env.EXOCLICK_API_KEY;
    this.baseURL = 'https://connectors.windsor.ai';
    this.trafficJunkyBaseURL = 'https://api.trafficjunky.com';

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    if (!this.apiKey) {
      console.warn('⚠️  WINDSOR_API_KEY not found in environment variables');
    }
  }

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

  async fetchAdData(startDate, endDate, dataSource = 'facebook_ads', storeId = null) {
    try {
      if (!this.apiKey) {
        throw new Error('Windsor API key not configured');
      }

      var query = {}
      if (storeId == "meonutrition") {
        query = { select_accounts: "google_ads__912-676-2735,facebook__2024454474573344" }
      }
      else if (storeId == "buycosari") {
        query = { select_accounts: "google_ads__102-337-4754" }
      }
      else if (storeId == "cosara") {
        query = { select_accounts: "google_ads__917-538-6903,taboola__interactiveecommercellc-network,facebook__972524497929970" }
      }
      else if (storeId == "nomobark") {
        query = { select_accounts: "google_ads__150-979-2980" }
      }
      else if (storeId == "dermao") {
        query = { select_accounts: "google_ads__973-401-9827" }
      }
      else if (storeId == "gamoseries") {
        query = { select_accounts: "google_ads__102-337-4754" }
      }


      if (storeId == "cosara") {

      }
      // const r = await fetch(`${this.trafficJunkyBaseURL}/api/campaigns.json`, {
      //   method: 'GET',
      //   headers: {
      //     'Authorization': `Bearer ${this.trafficJunkyApiKey}`,
      //     'Content-Type': 'application/json'
      //   }
      // });

      // if (!r.ok) {
      //   throw new Error(`HTTP error! status: ${r.status}`);
      // }

      // let campaignId = 1011865092;
      // const res = await fetch(
      //   `${this.trafficJunkyBaseURL}/api/ads/${campaignId}/stats.json?from=${startDate}&to=${endDate}`,
      //   { headers: { Authorization: `Bearer ${this.trafficJunkyApiKey}` } }
      // );
      // if (!res.ok) throw new Error(`Failed to fetch stats for campaign ${campaignId}: ${res.status}`);

      // console.log(await res.json());
  
      
  
      // console.log('Ads:', await r.json());
      // return [];
      // facebook__2024454474573344
      if (common.diffInMonths(common.createLocalDateWithTime(startDate), common.createLocalDateWithTime(new Date())) < 36) {
        if (common.createLocalDateWithTime(startDate).getTime() > new Date().getTime()) {
          startDate = new Date().toISOString().split("T")[0]
        }
        if (startDate === endDate) {
          query = { ...query, date_from: startDate }
        }
        else {
          query = { ...query, date_from: startDate, date_to: endDate }
        }
      }
      else {
        startDate = new Date(new Date().getFullYear(), new Date().getMonth() - 35, 1).toISOString().split("T")[0]
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

        const { data: campaignLinks } = await this.supabase.from("product_campaign_links").select("campaign_name, product_sku").in("campaign_name", campaignNames);
        if (campaignLinks.length > 0) {
          var productSkus = campaignLinks.map(item => item.product_sku);
          if (productSkus.length > 0) {
            await common.initialSiteData(common, storeId, productSkus);
          }
        }

        return this.processWindsorData(data, dataSource, storeId);
      } else {
        return [];
      }

    } catch (error) {
      console.error('❌ Error fetching data from Windsor.ai:', error.message);
      throw error;
    }
  }

  async processWindsorData(data, dataSource, storeId) {
    var { data: adCampaigns } = await this.supabase.from("ad_campaigns").select("campaign_id, currency, currency_symbol").eq("store_id", storeId);
    return data.map((item) => {
      var campaign = adCampaigns.find(campaign => campaign.campaign_id == item.campaign);
      var currency = campaign?.currency || 1.0;
      var currency_symbol = campaign?.currency_symbol || 'USD';
      if (!campaign && item.source == "facebook") {
        currency_symbol = "SEK";
        currency = common.currencyRates[currency_symbol];
      }
      return ({
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
        platform: item.source,
        data_source: item.datasource,
        account_name: item.account_name,
        currency: currency,
        currency_symbol: currency_symbol
      })
    });
  }

  async fetchAllAdData(startDate, endDate, storeId) {
    try {

      // Use the single endpoint that returns all data
      const data = await this.fetchAdData(startDate, endDate, 'all', storeId);


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

  async saveAdDataToDatabase(adData, socket = null, storeId = null, socketStatus = null) {
    try {
      // Group data by campaign for campaign table
      const campaigns = new Map();
      const adSpendRecords = [];

      var originCampaigns = [];
      const { count: campaignsCount } = await this.supabase.from('ad_campaigns').select('*', { count: 'exact' }).eq("store_id", storeId);
      if (campaignsCount > 0) {
        for (var i = 0; i < campaignsCount; i += 1000) {
          const { data } = await this.supabase.from('ad_campaigns').select("campaign_id, currency, currency_symbol").eq("store_id", storeId).range(i, i + 999);
          originCampaigns.push(...data);
        }
      }
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

        var originCampaign = originCampaigns.find(item => item.campaign_id == record.campaign_id);
        if (originCampaign) {
          record.currency = originCampaign.currency;
          record.currency_symbol = originCampaign.currency_symbol;
        }
        else {
          record.currency = record.platform == "google" ? 1 : 0.1;
          record.currency_symbol = record.platform == "google" ? "USD" : "SEK";
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
          product_id: null,
          currency: record.currency,
          currency_symbol: record.currency_symbol
        });
      }

      // Save campaigns to database
      if (socket) {
        this.sendWebSocketMessage(socket, socketStatus, {
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

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

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
        }
      }

      // Save ad spend data to database
      if (socket) {
        this.sendWebSocketMessage(socket, socketStatus, {
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

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          if (socket) {
            this.sendWebSocketMessage(socket, socketStatus, {
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
        }
      }

      return {
        campaignsSaved: campaignArray.length,
        adSpendRecordsSaved: adSpendRecords.length
      };

    } catch (error) {
      console.error('❌ Error saving Windsor.ai data to database:', error);
      throw error;
    }
  }

  async fetchAndSaveAdData(startDate, endDate, socket = null, storeId = null, socketStatus = null) {
    try {
      var date = new Date();
      // Emit initial progress
      if (socket) {
        this.sendWebSocketMessage(socket, socketStatus, {
          stage: 'starting',
          message: `🔄 Starting Windsor.ai ads sync for ${storeId || 'all stores'}...`,
          progress: 0,
          total: 'unlimited'
        });
      }

      // Fetch data from Windsor.ai
      if (socket) {
        this.sendWebSocketMessage(socket, socketStatus, {
          stage: 'fetching',
          message: `📥 Fetching ad data from Windsor.ai for ${storeId || 'all stores'}...`,
          progress: 20,
          total: 'unlimited'
        });
      }

      const adData = await this.fetchAllAdData(startDate, endDate, storeId);

      if (adData.length === 0) {
        if (socket) {
          this.sendWebSocketMessage(socket, socketStatus, {
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
        this.sendWebSocketMessage(socket, socketStatus, {
          stage: 'saving',
          message: `💾 Saving ${adData.length} ad records to database...`,
          progress: 60,
          total: 'unlimited'
        });
      }

      // Save to database
      const result = await this.saveAdDataToDatabase(adData, socket, storeId, socketStatus);

      if (socket) {
        this.sendWebSocketMessage(socket, socketStatus, {
          stage: 'sync_completed',
          message: '✅ Windsor.ai ads sync completed!',
          progress: 100,
          total: 'unlimited',
          campaignsSaved: result.campaignsSaved,
          adSpendRecordsSaved: result.adSpendRecordsSaved
        });
      }

      await analyticsService.recalculateAdsOnlyAnalytics(socket, socketStatus, startDate, endDate, storeId);

      await common.updateSyncTracking('last_ads_sync_date', date, storeId);

      return result;

    } catch (error) {
      console.error('❌ Error in Windsor.ai fetch and save:', error);

      if (socket) {
        this.sendWebSocketMessage(socket, socketStatus, {
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