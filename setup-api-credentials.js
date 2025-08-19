const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 API Credentials Setup Helper');
console.log('================================\n');

// Check current environment variables
const requiredVars = {
  'Google Ads': [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET', 
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
    'GOOGLE_ADS_DEVELOPER_TOKEN'
  ],
  'Facebook Ads': [
    'FACEBOOK_ACCESS_TOKEN',
    'FACEBOOK_AD_ACCOUNT_ID'
  ]
};

console.log('📋 Current Configuration Status:\n');

let allConfigured = true;

Object.entries(requiredVars).forEach(([platform, vars]) => {
  console.log(`${platform} API:`);
  vars.forEach(varName => {
    const value = process.env[varName];
    const status = value && value !== 'your_' + varName.toLowerCase() + '_here' ? '✅' : '❌';
    console.log(`  ${status} ${varName}: ${value ? 'Configured' : 'Not configured'}`);
    if (!value || value === 'your_' + varName.toLowerCase() + '_here') {
      allConfigured = false;
    }
  });
  console.log('');
});

if (allConfigured) {
  console.log('🎉 All API credentials are configured!');
  console.log('You can now use the sync buttons in the dashboard.');
} else {
  console.log('⚠️  Some API credentials are missing.');
  console.log('\n📖 To set up the APIs:');
  console.log('1. Follow the API_SETUP_GUIDE.md');
  console.log('2. Update your .env file with the credentials');
  console.log('3. Run this script again to verify');
  
  console.log('\n🔗 Quick Links:');
  console.log('- Google Ads API Setup: https://developers.google.com/google-ads/api/docs/first-call/dev-token');
  console.log('- Facebook Ads API Setup: https://developers.facebook.com/docs/marketing-api/getting-started');
  
  console.log('\n📝 For now, you can still:');
  console.log('- Use manual entry for ad spend data');
  console.log('- Test the dashboard with sample data');
  console.log('- Set up API credentials later');
}

console.log('\n🚀 Next Steps:');
console.log('1. If credentials are configured: Test sync buttons in dashboard');
console.log('2. If not configured: Follow API_SETUP_GUIDE.md');
console.log('3. Check server logs for detailed error messages'); 