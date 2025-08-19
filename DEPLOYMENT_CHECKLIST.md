# ✅ **Deployment Checklist: GitHub → Digital Ocean**

## 🔒 **Pre-Push Security Check**

Before pushing to GitHub, verify:

- [ ] **No real API tokens** in any files
- [ ] **No `.env` files** with actual values
- [ ] **No hardcoded secrets** in source code
- [ ] **`.gitignore`** properly configured
- [ ] **Template files** use placeholder values only

## 📁 **Files Safe to Push to GitHub**

✅ **Source Code:**
- `server/` - Backend code
- `client/` - Frontend React app
- `package.json` files
- `Dockerfile.prod`
- `.dockerignore`

✅ **Configuration:**
- `.do/app.yaml` - Digital Ocean App Platform config
- `env.template` - Environment variables template
- `env.production` - Production template (with placeholders)

✅ **Documentation:**
- `DEPLOYMENT.md` - Deployment guide
- `ENVIRONMENT_VARIABLES.md` - Variables reference
- `README.md` - Project documentation

✅ **Scripts:**
- `setup-local.sh` - Local development setup
- `deploy.sh` - Droplet deployment script
- `.github/workflows/deploy.yml` - GitHub Actions

## 🚫 **Files NEVER Push to GitHub**

❌ **Environment Files:**
- `.env` (if exists)
- `.env.local`
- `.env.production` (with real values)
- Any file with actual API keys

❌ **Sensitive Data:**
- Database credentials
- API keys and tokens
- Private keys
- SSL certificates

## 🚀 **Deployment Steps**

### **Step 1: Push to GitHub**
```bash
# Add all files (safe ones)
git add .

# Commit changes
git commit -m "Add Digital Ocean deployment configuration"

# Push to GitHub
git push origin main
```

### **Step 2: Deploy on Digital Ocean**

1. **Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)**
2. **Click "Create App"**
3. **Connect your GitHub repository**
4. **Select the `main` branch**
5. **Digital Ocean will auto-detect `.do/app.yaml`**
6. **Set environment variables in the dashboard** (this is where you put real tokens!)

### **Step 3: Configure Environment Variables**

**In Digital Ocean dashboard, set these values:**

**Core:**
- `SUPABASE_URL` = `https://your-real-project.supabase.co`
- `SUPABASE_ANON_KEY` = `your_real_supabase_key`
- `WINDSOR_API_KEY` = `your_real_windsor_key`
- `JWT_SECRET` = `your_real_jwt_secret`
- `REACT_APP_API_URL` = `https://your-backend-domain.com`

**Shopify Stores (all 6 required):**
- `COSARI_ACCESS_TOKEN` = `your_real_buycosari_token`
- `MEONUTRITION_ACCESS_TOKEN` = `your_real_meonutrition_token`
- `NOMOBARK_ACCESS_TOKEN` = `your_real_nomobark_token`
- `DERMAO_ACCESS_TOKEN` = `your_real_dermao_token`
- `GAMOSERIES_ACCESS_TOKEN` = `your_real_gamoseries_token`
- `COSARA_ACCESS_TOKEN` = `your_real_cosara_token`

## 🔍 **Final Verification**

Before clicking "Create Resources":

- [ ] All 6 Shopify access tokens set
- [ ] Supabase credentials correct
- [ ] Windsor.ai API key valid
- [ ] JWT secret is strong and unique
- [ ] Repository branch is correct
- [ ] App name is set to `shopify-dashboard`

## 🚨 **Common Issues & Solutions**

### **Build Failures**
- Check if all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check for syntax errors in code

### **Environment Variable Issues**
- Ensure all required variables are set
- Check variable names match exactly
- Verify no extra spaces or quotes

### **API Connection Issues**
- Test Shopify tokens individually
- Verify Supabase project is active
- Check Windsor.ai API key validity

## 📞 **Need Help?**

1. **Check Digital Ocean logs** in the dashboard
2. **Verify environment variables** are set correctly
3. **Test individual API connections** using your tokens
4. **Check the deployment guide** (`DEPLOYMENT.md`)

---

**Remember:** Your API tokens are safe as long as they're only in the Digital Ocean dashboard, not in your GitHub repository!
