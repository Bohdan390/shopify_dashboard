const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkCampaignCounts() {
  try {
    console.log('🔍 Checking campaign counts...\n');

    // Check ad_spend_detailed table
    const { data: adSpendData, error: adSpendError } = await supabase
      .from('ad_spend_detailed')
      .select('campaign_id, platform');

    if (adSpendError) {
      console.error('❌ Error fetching ad_spend_detailed:', adSpendError);
      return;
    }

    const uniqueAdSpendCampaigns = [...new Set(adSpendData.map(item => item.campaign_id))];
    
    console.log('📊 Ad Spend Detailed Table:');
    console.log(`   Total records: ${adSpendData.length}`);
    console.log(`   Unique campaigns: ${uniqueAdSpendCampaigns.length}`);
    console.log(`   Sample campaigns: ${uniqueAdSpendCampaigns.slice(0, 5).join(', ')}`);

    // Check ad_campaigns table
    const { data: adCampaignsData, error: adCampaignsError } = await supabase
      .from('ad_campaigns')
      .select('campaign_id, campaign_name, platform, status');

    if (adCampaignsError) {
      console.error('❌ Error fetching ad_campaigns:', adCampaignsError);
      return;
    }

    const activeCampaigns = adCampaignsData.filter(campaign => campaign.status === 'active');
    
    console.log('\n📊 Ad Campaigns Table:');
    console.log(`   Total campaigns: ${adCampaignsData.length}`);
    console.log(`   Active campaigns: ${activeCampaigns.length}`);
    console.log(`   Sample campaigns: ${activeCampaigns.slice(0, 5).map(c => c.campaign_id).join(', ')}`);

    // Compare the two
    console.log('\n🔍 Comparison:');
    console.log(`   Campaigns with spend data: ${uniqueAdSpendCampaigns.length}`);
    console.log(`   Total campaigns in master table: ${adCampaignsData.length}`);
    console.log(`   Active campaigns in master table: ${activeCampaigns.length}`);
    
    // Find campaigns that are in ad_campaigns but not in ad_spend_detailed
    const campaignsWithoutSpend = activeCampaigns.filter(campaign => 
      !uniqueAdSpendCampaigns.includes(campaign.campaign_id)
    );
    
    console.log(`   Active campaigns without spend data: ${campaignsWithoutSpend.length}`);
    
    if (campaignsWithoutSpend.length > 0) {
      console.log('\n📋 Active campaigns without spend data:');
      campaignsWithoutSpend.slice(0, 10).forEach(campaign => {
        console.log(`   - ${campaign.campaign_id} (${campaign.platform})`);
      });
      if (campaignsWithoutSpend.length > 10) {
        console.log(`   ... and ${campaignsWithoutSpend.length - 10} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCampaignCounts(); 