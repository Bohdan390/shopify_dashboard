const { supabase } = require('../config/database-supabase');

class CampaignRoiService {
  async calculateCampaignRoi(date) {
    try {
      console.log(`📊 Calculating campaign ROI for ${date}...`);
      
      // Use the database function to calculate campaign ROI
      const { data, error } = await supabase
        .rpc('calculate_campaign_roi', { target_date: date });

      if (error) {
        console.error('❌ Error calculating campaign ROI:', error);
        throw error;
      }

      console.log(`✅ Calculated ROI for ${data.length} campaigns`);
      return data;
    } catch (error) {
      console.error('Error calculating campaign ROI:', error);
      throw error;
    }
  }

  async saveCampaignRoi(date, socket = null) {
    try {
      console.log(`💾 Saving campaign ROI data for ${date}...`);
      
      if (socket) {
        socket.emit('roiProgress', {
          stage: 'calculating',
          message: `📊 Calculating campaign ROI for ${date}...`,
          progress: 50
        });
      }

      // Calculate ROI for the date
      const roiData = await this.calculateCampaignRoi(date);
      
      if (socket) {
        socket.emit('roiProgress', {
          stage: 'saving',
          message: `💾 Saving ${roiData.length} campaign ROI records...`,
          progress: 75
        });
      }

      // Delete existing ROI data for this date
      const { error: deleteError } = await supabase
        .from('campaign_roi')
        .delete()
        .eq('date', date);

      if (deleteError) {
        console.error('❌ Error deleting existing campaign ROI:', deleteError);
        throw deleteError;
      }

      // Prepare data for insertion
      const roiRecords = roiData.map(record => ({
        campaign_id: record.campaign_id,
        campaign_name: record.campaign_name,
        platform: record.platform,
        date: date,
        revenue: record.revenue,
        cost_of_goods: record.cost_of_goods,
        ad_spend: record.ad_spend,
        profit: record.profit,
        roi_percentage: record.roi_percentage
      }));

      // Insert new ROI data
      if (roiRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('campaign_roi')
          .insert(roiRecords);

        if (insertError) {
          console.error('❌ Error inserting campaign ROI:', insertError);
          throw insertError;
        }
      }

      if (socket) {
        socket.emit('roiProgress', {
          stage: 'completed',
          message: `✅ Campaign ROI saved for ${date}`,
          progress: 100,
          processedCampaigns: roiRecords.length
        });
      }

      console.log(`✅ Successfully saved ${roiRecords.length} campaign ROI records for ${date}`);
      return roiRecords;
    } catch (error) {
      console.error('Error saving campaign ROI:', error);
      
      if (socket) {
        socket.emit('roiProgress', {
          stage: 'error',
          message: `❌ Error saving campaign ROI: ${error.message}`,
          progress: 0,
          error: error.message
        });
      }
      
      throw error;
    }
  }

  async getCampaignRoiRange(startDate, endDate) {
    try {
      console.log(`📊 Fetching campaign ROI range: ${startDate} to ${endDate}`);
      
      const { data, error } = await supabase
        .from('campaign_roi')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('campaign_name');

      if (error) {
        console.error('❌ Error fetching campaign ROI data:', error);
        throw error;
      }

      console.log(`📊 Found ${data.length} campaign ROI records`);
      return data;
    } catch (error) {
      console.error('Error getting campaign ROI range:', error);
      throw error;
    }
  }

  async getCampaignRoiSummary(startDate, endDate) {
    try {
      console.log(`📊 Getting campaign ROI summary for ${startDate} to ${endDate}`);
      
      const { data, error } = await supabase
        .from('campaign_roi')
        .select('campaign_id, campaign_name, platform, revenue, cost_of_goods, ad_spend, profit, roi_percentage')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        console.error('❌ Error fetching campaign ROI summary:', error);
        throw error;
      }

      // Group by campaign and calculate totals
      const campaignSummary = {};
      data.forEach(record => {
        const key = `${record.campaign_id}_${record.platform}`;
        if (!campaignSummary[key]) {
          campaignSummary[key] = {
            campaign_id: record.campaign_id,
            campaign_name: record.campaign_name,
            platform: record.platform,
            total_revenue: 0,
            total_cost_of_goods: 0,
            total_ad_spend: 0,
            total_profit: 0,
            avg_roi_percentage: 0,
            days_count: 0
          };
        }
        
        campaignSummary[key].total_revenue += parseFloat(record.revenue || 0);
        campaignSummary[key].total_cost_of_goods += parseFloat(record.cost_of_goods || 0);
        campaignSummary[key].total_ad_spend += parseFloat(record.ad_spend || 0);
        campaignSummary[key].total_profit += parseFloat(record.profit || 0);
        campaignSummary[key].days_count += 1;
      });

      // Calculate average ROI for each campaign
      Object.values(campaignSummary).forEach(campaign => {
        campaign.avg_roi_percentage = campaign.total_ad_spend > 0 
          ? (campaign.total_profit / campaign.total_ad_spend) * 100 
          : 0;
      });

      const summaryArray = Object.values(campaignSummary);
      console.log(`📊 Generated summary for ${summaryArray.length} campaigns`);
      
      return summaryArray;
    } catch (error) {
      console.error('Error getting campaign ROI summary:', error);
      throw error;
    }
  }

  async recalculateAllCampaignRoi(socket = null) {
    try {
      console.log('🔄 Recalculating all campaign ROI...');
      
      if (socket) {
        socket.emit('roiProgress', {
          stage: 'starting',
          message: '🔄 Starting campaign ROI recalculation...',
          progress: 0
        });
      }

      // Get all unique dates from orders
      const { data: orderDates, error: orderDatesError } = await supabase
        .from('orders')
        .select('created_at')
        .eq('financial_status', 'paid');

      if (orderDatesError) throw orderDatesError;

      const uniqueDates = [...new Set(orderDates.map(order => 
        new Date(order.created_at).toISOString().split('T')[0]
      ))].sort();

      if (socket) {
        socket.emit('roiProgress', {
          stage: 'processing',
          message: `📊 Processing ${uniqueDates.length} unique dates...`,
          progress: 10
        });
      }

      let processedDates = 0;
      for (const date of uniqueDates) {
        console.log(`🔄 Calculating campaign ROI for ${date}... (${processedDates + 1}/${uniqueDates.length})`);
        
        if (socket) {
          const progress = 10 + Math.floor((processedDates / uniqueDates.length) * 80);
          socket.emit('roiProgress', {
            stage: 'calculating',
            message: `📊 Calculating campaign ROI for ${date}... (${processedDates + 1}/${uniqueDates.length})`,
            progress: progress,
            total: uniqueDates.length,
            current: processedDates + 1
          });
        }
        
        await this.saveCampaignRoi(date);
        processedDates++;
      }

      if (socket) {
        socket.emit('roiProgress', {
          stage: 'completed',
          message: '✅ Campaign ROI recalculation completed successfully!',
          progress: 100,
          processedDates: uniqueDates.length
        });
      }

      console.log('✅ Campaign ROI recalculation completed');
    } catch (error) {
      console.error('❌ Error recalculating campaign ROI:', error);
      
      if (socket) {
        socket.emit('roiProgress', {
          stage: 'error',
          message: `❌ Error recalculating campaign ROI: ${error.message}`,
          progress: 0,
          error: error.message
        });
      }
      
      throw error;
    }
  }
}

module.exports = new CampaignRoiService(); 