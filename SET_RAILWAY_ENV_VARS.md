# Set Railway Environment Variables

## ⚠️ CRITICAL: Add These to Railway NOW

Your bot is crashing because `DISCORD_TOKEN` is not set. Follow these steps:

## Step 1: Go to Railway Dashboard

1. Open https://railway.app
2. Select your **ACE-prime** service
3. Click on the **Variables** tab

## Step 2: Add DISCORD_TOKEN

1. Click **+ New Variable**
2. **Name:** `DISCORD_TOKEN`
3. **Value:** `[YOUR_BOT_TOKEN_HERE]` - Get from https://discord.com/developers/applications → Your Bot → Bot → Reset Token
4. Click **Add**

## Step 3: Add DISCORD_CLIENT_ID

1. Click **+ New Variable** again
2. **Name:** `DISCORD_CLIENT_ID`
3. **Value:** `[YOUR_CLIENT_ID_HERE]` - Get from https://discord.com/developers/applications → Your Bot → General Information → Application ID
4. Click **Add**

## Step 4: Add NODE_ENV (Recommended)

1. Click **+ New Variable** again
2. **Name:** `NODE_ENV`
3. **Value:** `production`
4. Click **Add**

## Step 5: Verify

After adding all variables, Railway will automatically redeploy. Check the logs - you should see:
- ✅ `DISCORD_TOKEN found`
- ✅ `DISCORD_CLIENT_ID found: 1456227175798669326`
- ✅ `Login successful!`
- ✅ `ACE Prime is ONLINE!`

## ⚠️ SECURITY WARNING

**NEVER commit your Discord token to GitHub!** 
- Tokens in code = security risk
- Anyone with access can control your bot
- Always use environment variables

## Quick Reference

| Variable Name | Where to Get It |
|--------------|----------------|
| `DISCORD_TOKEN` | Discord Developer Portal → Your Bot → Bot → Reset Token |
| `DISCORD_CLIENT_ID` | Discord Developer Portal → Your Bot → General Information → Application ID |
| `NODE_ENV` | Set to `production` |

## After Setting Variables

1. Railway will auto-redeploy (watch the Deployments tab)
2. Check logs - bot should connect successfully
3. Bot should appear online in Discord
4. Test with `/hello` and `/ping` commands

