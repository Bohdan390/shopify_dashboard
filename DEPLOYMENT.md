# 🚀 Digital Ocean Deployment Guide

This guide will help you deploy your Shopify Dashboard to Digital Ocean.

## 📋 Prerequisites

- Digital Ocean account
- GitHub repository with your code
- Domain name (optional but recommended)
- Environment variables ready for all 6 Shopify stores

## 🔒 **IMPORTANT: Security First!**

**NEVER commit API tokens or secrets to GitHub!** This is a critical security practice.

### ✅ **What to DO:**
- Use environment variables
- Set values in Digital Ocean dashboard
- Use `.env.local` for local development (never commit)
- Use `env.template` as a reference

### ❌ **What NOT to do:**
- Hardcode tokens in your code
- Commit `.env` files to GitHub
- Share tokens in public repositories
- Use real tokens in example files

## 🏪 Multi-Store Configuration

Your application supports **6 Shopify stores**:
1. **Buycosari.com** - `COSARI_ACCESS_TOKEN`
2. **Meonutrition.com** - `MEONUTRITION_ACCESS_TOKEN`
3. **Nomobark.com** - `NOMOBARK_ACCESS_TOKEN`
4. **Dermao.com** - `DERMAO_ACCESS_TOKEN`
5. **Gamoseries.com** - `GAMOSERIES_ACCESS_TOKEN`
6. **Cosara.com** - `COSARA_ACCESS_TOKEN`

## 🎯 Option 1: Digital Ocean App Platform (Recommended for beginners)

### Step 1: Prepare Your Repository
1. **Push your code to GitHub** (without any real tokens!)
2. **Update `.do/app.yaml`** with your actual repository details
3. **Commit and push** the changes

### Step 2: Deploy on Digital Ocean
1. Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Select the branch (usually `main` or `master`)
5. Digital Ocean will automatically detect the configuration from `.do/app.yaml`
6. **Set your environment variables in the dashboard** (this is where you put real tokens!)
7. Click "Create Resources"

### Step 3: Configure Environment Variables
**In the Digital Ocean dashboard** (not in your code), add these environment variables:

**Required for all deployments:**
- `SUPABASE_URL` = `https://your-actual-project.supabase.co`
- `SUPABASE_ANON_KEY` = `your_actual_supabase_anon_key`
- `WINDSOR_API_KEY` = `your_actual_windsor_api_key`
- `JWT_SECRET` = `your_actual_very_strong_jwt_secret`
- `REACT_APP_API_URL` = `https://your-backend-domain.com`

**Shopify Store Access Tokens (all 6 required):**
- `COSARI_ACCESS_TOKEN` = `your_actual_buycosari_token`
- `MEONUTRITION_ACCESS_TOKEN` = `your_actual_meonutrition_token`
- `NOMOBARK_ACCESS_TOKEN` = `your_actual_nomobark_token`
- `DERMAO_ACCESS_TOKEN` = `your_actual_dermao_token`
- `GAMOSERIES_ACCESS_TOKEN` = `your_actual_gamoseries_token`
- `COSARA_ACCESS_TOKEN` = `your_actual_cosara_token`

**Note:** The `SHOPIFY_API_VERSION` is automatically set to "2024-04" in the configuration.

## 🐳 Option 2: Digital Ocean Droplet with Docker (More control)

### Step 1: Create a Droplet
1. Go to [Digital Ocean Droplets](https://cloud.digitalocean.com/droplets)
2. Click "Create Droplet"
3. Choose Ubuntu 22.04 LTS
4. Select your preferred plan (Basic plan with 1GB RAM minimum)
5. Choose a datacenter region close to your users
6. Add your SSH key
7. Click "Create Droplet"

### Step 2: Connect to Your Droplet
```bash
ssh root@your-droplet-ip
```

### Step 3: Run the Deployment Script
```bash
# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/your-username/your-repo/main/deploy.sh | bash
```

### Step 4: Upload Your Application
```bash
# From your local machine, upload your code
scp -r . root@your-droplet-ip:/opt/shopify-dashboard/
```

### Step 5: Configure Environment Variables
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Navigate to the app directory
cd /opt/shopify-dashboard

# Create production environment file
cp env.production .env.production
nano .env.production  # Edit with your ACTUAL values here
```

**Important:** 
- Make sure to set all 6 Shopify store access tokens in your `.env.production` file
- This file stays on the server and is never uploaded to GitHub
- Use the `env.template` file as a reference for the structure

### Step 6: Update Nginx Configuration
```bash
# Edit nginx.conf with your actual domain
nano nginx.conf
# Replace 'your-domain.com' with your actual domain
```

### Step 7: Deploy
```bash
# Build and start the application
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

## 🔒 SSL Certificate Setup

### Using Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring and Maintenance

### Check Application Status
```bash
# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f shopify-dashboard

# Check health endpoint
curl http://localhost/health
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Backup
```bash
# Backup environment variables
cp .env.production .env.production.backup

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo kill -9 <PID>
   ```

2. **Docker permission issues**
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

3. **Environment variables not loading**
   - Check `.env.production` file exists
   - Verify variable names match exactly
   - **Ensure all 6 Shopify access tokens are set**
   - Restart containers after changes

4. **Build failures**
   ```bash
   # Clean Docker cache
   docker system prune -a
   docker-compose build --no-cache
   ```

5. **Shopify API errors**
   - Verify all access tokens are valid
   - Check if tokens have expired
   - Ensure proper API permissions for each store

### Getting Help
- Check Docker logs: `docker-compose logs -f`
- Check Nginx logs: `docker-compose logs nginx`
- Verify environment variables: `docker-compose exec shopify-dashboard env`
- Test individual store connections through your API endpoints

## 🌐 Domain and DNS Setup

1. Point your domain's A record to your Droplet's IP address
2. Wait for DNS propagation (can take up to 48 hours)
3. Test your domain: `https://your-domain.com`

## 💰 Cost Optimization

- Use Basic plan for development/testing
- Consider App Platform for production (easier scaling)
- Monitor bandwidth usage
- Use object storage for file uploads if needed

## 🔄 Continuous Deployment

Consider setting up GitHub Actions for automatic deployment:

1. Create `.github/workflows/deploy.yml`
2. **Configure secrets in GitHub repository** (including all 6 Shopify tokens)
3. Auto-deploy on push to main branch

## 🏪 Store Management

### Adding New Stores
To add a new Shopify store:
1. Add the store configuration to `server/services/shopifyService.js`
2. Add the access token to your environment variables
3. Update the frontend store selector in `client/src/components/GlobalStoreSelector.js`
4. Redeploy your application

### Store-Specific Data
Each store maintains separate:
- Orders and revenue data
- Analytics calculations
- Ad spend tracking
- Customer information

## 🔐 **Local Development Setup**

For local development:

1. **Copy the template:**
   ```bash
   cp env.template .env.local
   ```

2. **Edit `.env.local` with your actual values:**
   ```bash
   nano .env.local
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Never commit `.env.local`** (it's already in `.gitignore`)

---

**Need help?** Check the Digital Ocean documentation or create an issue in your repository.
