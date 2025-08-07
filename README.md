# Shopify Revenue & Profit Dashboard

A comprehensive dashboard for tracking Shopify revenue and calculating profit based on revenue, ad spend, and cost of goods.

## Features

- **Revenue Tracking**: Sync and display Shopify orders and revenue
- **Profit Calculation**: Calculate profit based on revenue, ad spend, and cost of goods
- **Ad Spend Management**: Track Google Ads and Facebook Ads spending via Windsor.ai
- **Cost of Goods**: Manage product costs and inventory
- **Analytics Dashboard**: Visual charts and detailed breakdowns
- **Campaign ROI**: Track campaign-level return on investment
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React, Tailwind CSS, Recharts
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Docker, Digital Ocean

## Database Schema

The application uses a consolidated database schema with the following key tables:

- **`orders`**: Shopify order data
- **`order_line_items`**: Product-level order details for ROI calculations
- **`ad_spend_detailed`**: Comprehensive ad spend data with performance metrics
- **`ad_campaigns`**: Campaign management and product mapping
- **`cost_of_goods`**: Product cost tracking
- **`analytics`**: Daily calculated analytics
- **`campaign_roi`**: Campaign-level ROI calculations

### Recent Schema Changes

**v2.0**: Consolidated ad spend tables
- Removed legacy `ad_spend` table
- All ad spend data now uses `ad_spend_detailed` table
- Enhanced with performance metrics (impressions, clicks, conversions)
- Better campaign and product mapping

If you're upgrading from an older version, run the migration script:
```sql
-- Run in Supabase SQL Editor
-- See migrate-ad-spend.sql for the complete migration script
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Docker (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shopify-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your API keys and database configuration
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb shopify_dashboard
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - Frontend development server on http://localhost:3000

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Dashboard: http://localhost:5000

## API Endpoints

### Shopify
- `POST /api/shopify/sync-orders` - Sync orders from Shopify
- `GET /api/shopify/revenue` - Get revenue data
- `GET /api/shopify/orders` - Get order list
- `GET /api/shopify/stats` - Get order statistics

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard data
- `GET /api/analytics/range` - Get analytics for date range
- `GET /api/analytics/summary` - Get summary statistics
- `POST /api/analytics/calculate/:date` - Calculate analytics for specific date
- `POST /api/analytics/recalculate` - Recalculate all analytics

### Ad Spend
- `POST /api/ads/spend` - Add ad spend entry
- `GET /api/ads/spend` - Get ad spend data
- `GET /api/ads/spend/summary` - Get ad spend summary
- `POST /api/ads/cog` - Add cost of goods entry
- `GET /api/ads/cog` - Get cost of goods data

## Environment Variables

```env
# Shopify API Configuration
SHOPIFY_SHOP_URL=buycosari.com
SHOPIFY_ACCESS_TOKEN=your_shopify_token
SHOPIFY_API_VERSION=2023-10

# Windsor.ai API (Unified Ad Data)
WINDSOR_API_KEY=your_windsor_api_key

# Legacy API Configurations (Optional - now handled by Windsor.ai)
# Google Ads API
GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id
GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret

# Facebook Ads API
FACEBOOK_ACCESS_TOKEN=your_facebook_token

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/shopify_dashboard

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_jwt_secret
```

## Digital Ocean Deployment

1. **Create a Droplet**
   - Choose Ubuntu 22.04 LTS
   - Select your preferred size (2GB RAM minimum recommended)
   - Add your SSH key

2. **Connect to your Droplet**
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Install Docker and Docker Compose**
   ```bash
   # Update system
   apt update && apt upgrade -y

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Install Docker Compose
   curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose

   # Start Docker service
   systemctl start docker
   systemctl enable docker
   ```

4. **Deploy the application**
   ```bash
   # Clone your repository
   git clone <your-repo-url>
   cd shopify-dashboard

   # Create .env file with production values
   cp env.example .env
   # Edit .env with production values

   # Build and start the application
   docker-compose up -d
   ```

5. **Set up Nginx (Optional)**
   ```bash
   # Install Nginx
   apt install nginx -y

   # Create Nginx configuration
   cat > /etc/nginx/sites-available/shopify-dashboard << EOF
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade \$http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host \$host;
           proxy_set_header X-Real-IP \$remote_addr;
           proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto \$scheme;
           proxy_cache_bypass \$http_upgrade;
       }
   }
   EOF

   # Enable the site
   ln -s /etc/nginx/sites-available/shopify-dashboard /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

## Usage

1. **Initial Setup**
   - Navigate to the dashboard
   - Click "Sync Orders" to pull data from Shopify
   - Add your ad spend data in the "Ad Spend" section
   - Add your cost of goods in the "Cost of Goods" section

2. **View Analytics**
   - Dashboard shows overview metrics
   - Analytics page provides detailed breakdowns
   - Use date filters to view specific periods

3. **Profit Calculation**
   - Profit = Revenue - Ad Spend - Cost of Goods
   - Profit margin is calculated as (Profit / Revenue) * 100

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on GitHub or contact the development team. 