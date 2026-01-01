#!/bin/bash
# Bash script to set Railway environment variables
# Requires Railway CLI to be installed: npm i -g @railway/cli

echo "🚀 ACE Prime - Railway Environment Variables Setup"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo ""
    echo "Install it with:"
    echo "  npm i -g @railway/cli"
    echo ""
    echo "Or set variables manually in Railway dashboard:"
    echo "  https://railway.app → Your Service → Variables"
    echo ""
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
echo "Checking Railway login status..."
if ! railway whoami &> /dev/null; then
    echo "⚠️  Not logged in to Railway. Please login first:"
    echo "  railway login"
    echo ""
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Set environment variables
echo "Setting environment variables..."
echo ""

echo "Setting DISCORD_TOKEN..."
railway variables set "DISCORD_TOKEN=[YOUR_BOT_TOKEN_HERE]"
if [ $? -eq 0 ]; then
    echo "  ✅ DISCORD_TOKEN set successfully"
else
    echo "  ❌ Failed to set DISCORD_TOKEN"
fi

echo "Setting DISCORD_CLIENT_ID..."
railway variables set "DISCORD_CLIENT_ID=1456227175798669326"
if [ $? -eq 0 ]; then
    echo "  ✅ DISCORD_CLIENT_ID set successfully"
else
    echo "  ❌ Failed to set DISCORD_CLIENT_ID"
fi

echo "Setting NODE_ENV..."
railway variables set "NODE_ENV=production"
if [ $? -eq 0 ]; then
    echo "  ✅ NODE_ENV set successfully"
else
    echo "  ❌ Failed to set NODE_ENV"
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Environment variables set!"
echo ""
echo "Railway will automatically redeploy your service."
echo "Check the Railway dashboard for deployment status."
echo ""
echo "Expected logs after deployment:"
echo "  ✅ DISCORD_TOKEN found"
echo "  ✅ DISCORD_CLIENT_ID found"
echo "  ✅ ACE Prime is ONLINE!"
echo ""

