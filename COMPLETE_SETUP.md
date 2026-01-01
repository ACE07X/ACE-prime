# 🚀 ACE Prime - Complete Setup Guide

## ⚠️ CRITICAL: Your Bot is Crashing Because Environment Variables Are Missing

**Current Status:** Bot crashes immediately because `DISCORD_TOKEN` is not set in Railway.

---

## 🎯 QUICK FIX (Do This First!)

### Step 1: Open Railway Dashboard
1. Go to https://railway.app
2. Login to your account
3. Click on **"ACE-prime"** service (the one that's crashing)

### Step 2: Add Environment Variables
1. Click the **"Variables"** tab (top navigation)
2. You'll see a list of variables (probably empty)

3. **Add Variable #1:**
   - Click **"+ New Variable"** button
   - **Name:** `DISCORD_TOKEN`
   - **Value:** `[YOUR_BOT_TOKEN_HERE]` - Get from Discord Developer Portal → Your Bot → Bot → Reset Token
   - Click **"Add"**

4. **Add Variable #2:**
   - Click **"+ New Variable"** again
   - **Name:** `DISCORD_CLIENT_ID`
   - **Value:** `1456227175798669326`
   - Click **"Add"**

5. **Add Variable #3:**
   - Click **"+ New Variable"** again
   - **Name:** `NODE_ENV`
   - **Value:** `production`
   - Click **"Add"**

### Step 3: Wait for Auto-Redeploy
- Railway will automatically detect the new variables
- It will trigger a new deployment
- Watch the **"Deployments"** tab
- Click on the latest deployment to see logs

### Step 4: Verify Success
In the logs, you should see:
```
[BOOT] Starting ACE Prime...
[BOOT] NODE_ENV: production
✅ DISCORD_TOKEN found
✅ DISCORD_CLIENT_ID found: 1456227175798669326
🔧 Initializing Discord client...
Loaded command: /hello
Loaded command: /ping
🔐 Attempting to login to Discord...
✅ Login successful! Waiting for ready event...
═══════════════════════════════════════
✅ ACE Prime is ONLINE!
   Bot: YourBot#1234 (1456227175798669326)
   Servers: 1
   Commands: 2
═══════════════════════════════════════
```

### Step 5: Test in Discord
1. Open Discord
2. Go to a server where your bot is invited
3. Type `/hello` - should work!
4. Type `/ping` - should work!

---

## 📋 Complete Environment Variables Reference

| Variable Name | Value | Required | Description |
|--------------|-------|----------|-------------|
| `DISCORD_TOKEN` | `[YOUR_BOT_TOKEN]` | ✅ **YES** | Discord bot token (get from Developer Portal) |
| `DISCORD_CLIENT_ID` | `1456227175798669326` | ✅ **YES** | Discord application ID |
| `NODE_ENV` | `production` | ⚠️ Recommended | Environment mode |

---

## 🔧 Alternative: Using Railway CLI

If you have Railway CLI installed:

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Set variables
railway variables set DISCORD_TOKEN="[YOUR_BOT_TOKEN]"
railway variables set DISCORD_CLIENT_ID="1456227175798669326"
railway variables set NODE_ENV="production"

# Deploy
railway up
```

---

## ✅ Verification Checklist

After setting variables, verify:

- [ ] All 3 variables are set in Railway Variables tab
- [ ] Railway shows "Deploying" or "Building" status
- [ ] Logs show `✅ DISCORD_TOKEN found`
- [ ] Logs show `✅ DISCORD_CLIENT_ID found`
- [ ] Logs show `✅ Login successful!`
- [ ] Logs show `✅ ACE Prime is ONLINE!`
- [ ] Bot appears online in Discord
- [ ] `/hello` command works
- [ ] `/ping` command works

---

## 🐛 Troubleshooting

### Problem: Still seeing "DISCORD_TOKEN is not set"
**Solution:**
- Double-check variable name is exactly `DISCORD_TOKEN` (case-sensitive)
- Make sure you clicked "Add" after entering the value
- Wait for Railway to redeploy (can take 30-60 seconds)
- Check logs again

### Problem: "TOKEN_INVALID" error
**Solution:**
- Token might be expired - reset it in Discord Developer Portal
- Go to https://discord.com/developers/applications
- Select your bot → Bot → Reset Token
- Update Railway variable with new token

### Problem: Bot connects but commands don't work
**Solution:**
- Commands need to be registered (happens automatically on startup)
- Check logs for "✅ Slash commands registered globally"
- If not, run: `npm run deploy-commands` locally (with your token)

### Problem: Bot not appearing in Discord
**Solution:**
- Make sure bot is invited to your server
- Go to Discord Developer Portal → OAuth2 → URL Generator
- Select scopes: `bot`, `applications.commands`
- Select permissions: Send Messages, Use Slash Commands
- Copy URL and open in browser to invite bot

---

## 📚 Additional Resources

- **Discord Developer Portal:** https://discord.com/developers/applications
- **Railway Dashboard:** https://railway.app
- **Railway Docs:** https://docs.railway.app
- **Discord.js Guide:** https://discordjs.guide

---

## 🔒 Security Notes

⚠️ **IMPORTANT:**
- Never commit your Discord token to GitHub
- Never share your token publicly
- If token is leaked, reset it immediately in Discord Developer Portal
- Use environment variables, never hardcode tokens

---

## 🎉 Success!

Once you see `✅ ACE Prime is ONLINE!` in the logs, your bot is ready!

The bot will:
- ✅ Connect to Discord automatically
- ✅ Register slash commands (`/hello`, `/ping`)
- ✅ Respond to commands in Discord
- ✅ Auto-restart on crashes (Railway restart policy)

---

**Need Help?** Check the logs in Railway - they now have detailed error messages that tell you exactly what's wrong!

