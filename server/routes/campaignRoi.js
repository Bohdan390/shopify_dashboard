const express = require('express');
const router = express.Router();
const campaignRoiService = require('../services/campaignRoiService');

// Get campaign ROI data for a date range
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required' 
      });
    }

    const data = await campaignRoiService.getCampaignRoiRange(startDate, endDate);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting campaign ROI range:', error);
    res.status(500).json({ 
      error: 'Failed to get campaign ROI data',
      message: error.message 
    });
  }
});

// Get campaign ROI summary for a date range
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required' 
      });
    }

    const data = await campaignRoiService.getCampaignRoiSummary(startDate, endDate);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting campaign ROI summary:', error);
    res.status(500).json({ 
      error: 'Failed to get campaign ROI summary',
      message: error.message 
    });
  }
});

// Calculate and save campaign ROI for a specific date
router.post('/calculate/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({ 
        error: 'Date is required' 
      });
    }

    const data = await campaignRoiService.saveCampaignRoi(date);
    res.json({ 
      success: true, 
      message: `Campaign ROI calculated and saved for ${date}`,
      data 
    });
  } catch (error) {
    console.error('Error calculating campaign ROI:', error);
    res.status(500).json({ 
      error: 'Failed to calculate campaign ROI',
      message: error.message 
    });
  }
});

// Recalculate all campaign ROI data
router.post('/recalculate-all', async (req, res) => {
  try {
    // Start the recalculation process
    campaignRoiService.recalculateAllCampaignRoi()
      .then(() => {
      })
      .catch((error) => {
        console.error('Campaign ROI recalculation failed:', error);
      });

    res.json({ 
      success: true, 
      message: 'Campaign ROI recalculation started. Check progress via WebSocket.' 
    });
  } catch (error) {
    console.error('Error starting campaign ROI recalculation:', error);
    res.status(500).json({ 
      error: 'Failed to start campaign ROI recalculation',
      message: error.message 
    });
  }
});

// Get campaign ROI for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({ 
        error: 'Date is required' 
      });
    }

    const data = await campaignRoiService.calculateCampaignRoi(date);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting campaign ROI for date:', error);
    res.status(500).json({ 
      error: 'Failed to get campaign ROI for date',
      message: error.message 
    });
  }
});

// Get all campaigns with their product mappings
router.get('/campaigns', async (req, res) => {
  try {
    const { data, error } = await require('../config/database-supabase').supabase
      .from('ad_campaigns')
      .select('campaign_id, campaign_name, platform, product_id, status')
      .eq('status', 'active')
      .order('campaign_name');

    if (error) {
      console.error('Error fetching campaigns:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch campaigns',
        message: error.message 
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({ 
      error: 'Failed to get campaigns',
      message: error.message 
    });
  }
});

module.exports = router; 