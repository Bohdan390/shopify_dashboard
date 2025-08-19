// Simple Google Ads Credential Validation
// This script validates the format and basic structure of your credentials

const CLIENT_ID = '1bc2a4478a835a1f55d89ea5667641eb';
const CLIENT_SECRET = '23deb4e7b2901fda67c321aec415ebf1';

console.log('🔍 Google Ads Credential Validation\n');

// Basic format validation
function validateFormat() {
  console.log('📋 Format Validation:');
  
  // Check client ID
  const clientIdValid = CLIENT_ID.length > 0 && CLIENT_ID.length <= 100;
  console.log(`Client ID (${CLIENT_ID.length} chars): ${clientIdValid ? '✅ Valid' : '❌ Invalid'}`);
  
  // Check client secret
  const clientSecretValid = CLIENT_SECRET.length >= 24 && CLIENT_SECRET.length <= 100;
  console.log(`Client Secret (${CLIENT_SECRET.length} chars): ${clientSecretValid ? '✅ Valid' : '❌ Invalid'}`);
  
  // Check character patterns
  const clientIdPattern = /^[A-Za-z0-9_-]+$/;
  const clientSecretPattern = /^[A-Za-z0-9_-]+$/;
  
  const clientIdPatternValid = clientIdPattern.test(CLIENT_ID);
  const clientSecretPatternValid = clientSecretPattern.test(CLIENT_SECRET);
  
  console.log(`Client ID pattern: ${clientIdPatternValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`Client Secret pattern: ${clientSecretPatternValid ? '✅ Valid' : '❌ Invalid'}`);
  
  return clientIdValid && clientSecretValid && clientIdPatternValid && clientSecretPatternValid;
}

// Check if credentials look like Google OAuth2 credentials
function checkGoogleOAuth2Format() {
  console.log('\n🔐 Google OAuth2 Format Check:');
  
  // Google OAuth2 client IDs are typically longer and may contain dots
  const isGoogleOAuth2ClientId = CLIENT_ID.length >= 32 && CLIENT_ID.length <= 100;
  const isGoogleOAuth2ClientSecret = CLIENT_SECRET.length >= 24 && CLIENT_SECRET.length <= 100;
  
  console.log(`Client ID length (32-100 chars): ${isGoogleOAuth2ClientId ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`Client Secret length (24-100 chars): ${isGoogleOAuth2ClientSecret ? '✅ Valid' : '❌ Invalid'}`);
  
  // Check if they look like Google format (alphanumeric with possible dots)
  const googleClientIdPattern = /^[A-Za-z0-9._-]+$/;
  const googleClientSecretPattern = /^[A-Za-z0-9_-]+$/;
  
  const looksLikeGoogleClientId = googleClientIdPattern.test(CLIENT_ID);
  const looksLikeGoogleClientSecret = googleClientSecretPattern.test(CLIENT_SECRET);
  
  console.log(`Client ID Google format: ${looksLikeGoogleClientId ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`Client Secret Google format: ${looksLikeGoogleClientSecret ? '✅ Valid' : '❌ Invalid'}`);
  
  return isGoogleOAuth2ClientId && isGoogleOAuth2ClientSecret && looksLikeGoogleClientId && looksLikeGoogleClientSecret;
}

// Provide recommendations
function provideRecommendations() {
  console.log('\n💡 Recommendations:');
  
  if (validateFormat() && checkGoogleOAuth2Format()) {
    console.log('✅ Your credentials appear to be in valid Google OAuth2 format');
    console.log('📋 Next steps to fully validate:');
    console.log('1. Apply for Google Ads API developer token');
    console.log('2. Set up OAuth2 consent screen in Google Cloud Console');
    console.log('3. Enable Google Ads API in your project');
    console.log('4. Test with actual API calls');
  } else {
    console.log('❌ Your credentials may have format issues');
    console.log('🔧 Recommendations:');
    console.log('1. Verify credentials from Google Cloud Console');
    console.log('2. Ensure you copied the full client ID and secret');
    console.log('3. Regenerate credentials if needed');
  }
}

// Check for common issues
function checkCommonIssues() {
  console.log('\n⚠️  Common Issues to Check:');
  
  const issues = [];
  
  if (CLIENT_ID.length < 32) {
    issues.push('Client ID seems too short for Google OAuth2');
  }
  
  if (CLIENT_SECRET.length < 24) {
    issues.push('Client Secret seems too short');
  }
  
  if (CLIENT_ID.includes(' ')) {
    issues.push('Client ID contains spaces (should be removed)');
  }
  
  if (CLIENT_SECRET.includes(' ')) {
    issues.push('Client Secret contains spaces (should be removed)');
  }
  
  if (issues.length === 0) {
    console.log('✅ No obvious format issues detected');
  } else {
    console.log('❌ Potential issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
}

// Main validation
function main() {
  console.log('🚀 Starting Google Ads Credential Validation...\n');
  
  const formatValid = validateFormat();
  const googleFormatValid = checkGoogleOAuth2Format();
  
  checkCommonIssues();
  provideRecommendations();
  
  console.log('\n📊 Summary:');
  console.log(`Format Validation: ${formatValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Google OAuth2 Format: ${googleFormatValid ? '✅ PASS' : '❌ FAIL'}`);
  
  if (formatValid && googleFormatValid) {
    console.log('\n🎉 Your credentials appear to be in valid format!');
    console.log('📝 To fully validate, you need to:');
    console.log('   1. Get a Google Ads API developer token');
    console.log('   2. Set up OAuth2 authentication');
    console.log('   3. Test with actual API calls');
  } else {
    console.log('\n⚠️  Your credentials may need attention');
    console.log('🔧 Check the recommendations above');
  }
}

main(); 