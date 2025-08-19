#!/bin/bash

set -e

echo "🚀 Starting Shopify Dashboard build process..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm ci

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm ci

# Check if react-scripts is available
echo "🔍 Checking if react-scripts is available..."
if [ -f "node_modules/.bin/react-scripts" ]; then
    echo "✅ react-scripts found"
else
    echo "❌ react-scripts not found in node_modules/.bin/"
    echo "📁 Contents of node_modules/.bin/:"
    ls -la node_modules/.bin/ || echo "Directory not accessible"
    exit 1
fi

# Build React app
echo "🔨 Building React app..."
npm run build

echo "✅ React app built successfully!"

# Go back to root
cd ..

echo "🎉 Build completed successfully!"
