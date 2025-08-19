# 🔑 Environment Variables Reference

This file lists all the environment variables required for your Shopify Dashboard application.

## 🚀 Production Deployment Variables

### Core Configuration
```bash
NODE_ENV=production
PORT=5000
```

### Database (Supabase)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Shopify API Configuration
```bash
# API Version (same for all stores)
SHOPIFY_API_VERSION=2024-04

# Store 1: Buycosari.com
COSARI_ACCESS_TOKEN=your_buycosari_access_token

# Store 2: Meonutrition.com
MEONUTRITION_ACCESS_TOKEN=your_meonutrition_access_token

# Store 3: Nomobark.com
NOMOBARK_ACCESS_TOKEN=your_nomobark_access_token

# Store 4: Dermao.com
DERMAO_ACCESS_TOKEN=your_dermao_access_token

# Store 5: Gamoseries.com
GAMOSERIES_ACCESS_TOKEN=your_gamoseries_access_token

# Store 6: Cosara.com
COSARA_ACCESS_TOKEN=your_cosara_access_token
```

### External APIs
```bash
# Windsor.ai API (Unified Ad Data)
WINDSOR_API_KEY=your_windsor_api_key

# JWT Secret for Authentication
JWT_SECRET=your_very_strong_jwt_secret_here
```

### Frontend Configuration
```bash
# Backend API URL for frontend
REACT_APP_API_URL=https://your-backend-domain.com
```

## 🏪 Store Configuration Details

Each Shopify store requires:
- **Access Token**: Private app access token with read permissions
- **Shop URL**: Automatically configured in the code
- **API Version**: Set to 2024-04 (latest stable)

### Required Shopify App Permissions
- `read_orders` - Access to order data
- `read_products` - Access to product information
- `read_customers` - Access to customer data
- `read_inventory` - Access to inventory levels

## 🔒 Security Notes

1. **Never commit access tokens to version control**
2. **Use strong, unique JWT secrets in production**
3. **Rotate access tokens regularly**
4. **Monitor API usage for each store**
5. **Use environment-specific configurations**

## 📋 Digital Ocean App Platform Setup

When setting up in Digital Ocean App Platform:

1. **Backend Service**: Set all environment variables
2. **Frontend Service**: Set only `REACT_APP_API_URL`
3. **Use the same variable names** as listed above
4. **Set values directly** (not as references to other variables)

## 🐳 Docker Deployment Setup

For Docker/Droplet deployment:

1. Copy `env.production` to `.env.production`
2. Fill in all the actual values
3. Ensure file permissions are secure
4. Restart containers after changes

## 🧪 Testing Environment Variables

Test your configuration:
```bash
# Check if all variables are loaded
node -e "console.log('SUPABASE_URL:', process.env.SUPABASE_URL)"
node -e "console.log('COSARI_ACCESS_TOKEN:', process.env.COSARI_ACCESS_TOKEN ? 'SET' : 'NOT SET')"

# Test store service initialization
node -e "
const ShopifyService = require('./server/services/shopifyService.js');
try {
  const service = new ShopifyService('buycosari');
  console.log('✅ Buycosari store configured successfully');
} catch (error) {
  console.log('❌ Error:', error.message);
}
"
```

## 🚨 Common Issues

1. **Missing Access Token**: Store won't sync data
2. **Invalid JWT Secret**: Authentication will fail
3. **Wrong Supabase URL**: Database connection errors
4. **Missing Windsor API Key**: Ad spend data won't sync

## 📞 Support

If you encounter issues:
1. Check all environment variables are set
2. Verify API permissions for each store
3. Test individual store connections
4. Check application logs for specific errors
