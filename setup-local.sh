#!/bin/bash

echo "🔐 Setting up local development environment..."
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    echo "   If you want to start fresh, delete it first: rm .env.local"
    echo ""
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Keeping existing .env.local"
        exit 1
    fi
fi

# Copy template to .env.local
echo "📋 Copying environment template..."
cp env.template .env.local

echo ""
echo "✅ .env.local created successfully!"
echo ""
echo "🔑 Next steps:"
echo "1. Edit .env.local with your actual API keys and tokens:"
echo "   nano .env.local"
echo ""
echo "2. Fill in these required values:"
echo "   - SUPABASE_URL and SUPABASE_ANON_KEY"
echo "   - All 6 Shopify store access tokens"
echo "   - WINDSOR_API_KEY"
echo "   - JWT_SECRET"
echo ""
echo "3. Start development:"
echo "   npm run dev"
echo ""
echo "🔒 Security reminder: .env.local is already in .gitignore"
echo "   Never commit this file to version control!"
echo ""
echo "📚 Use env.template as a reference for the structure"
