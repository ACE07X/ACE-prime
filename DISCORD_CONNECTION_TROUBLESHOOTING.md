# Discord Bot Connection Troubleshooting

## 🚨 Bot Not Connecting to Discord

If Railway shows **green** (deployment successful) but the bot is **not online** in Discord, follow these steps:

## Step 1: Check Railway Logs

1. Go to Railway dashboard → Your service → **Deployments** tab
2. Click on the latest deployment
3. Click **View Logs** or open the **Logs** tab
4. Look for these messages:

### ✅ Good Signs:
- `[BOOT] Starting ACE Prime...`
- `✅ DISCORD_TOKEN found`
- `✅ DISCORD_CLIENT_ID found: [your-client-id]`
- `🔐 Attempting to login to Discord...`
- `✅ Login successful! Waiting for ready event...`
- `✅ ACE Prime is ONLINE!`

### ❌ Error Signs:
- `❌ DISCORD_TOKEN is not set. Bot cannot start.`
- `❌ DISCORD_CLIENT_ID is not set. Bot cannot start.`
- `❌ Discord login failed!`
- `TOKEN_INVALID` or `TOKEN_MISSING` errors

## Step 2: Verify Environment Variables

In Railway dashboard → Your service → **Variables** tab, ensure you have:

### Required Variables:
1. **DISCORD_TOKEN**
   - Get from: https://discord.com/developers/applications
   - Go to your bot → Bot → Reset Token (if needed)
   - Copy the token (starts with `MTA...` or `NTA...`)
   - Paste into Railway Variables

2. **DISCORD_CLIENT_ID**
   - Get from: https://discord.com/developers/applications
   - Go to your bot → General Information → Application ID
   - Copy the Client ID (numeric, e.g., `123456789012345678`)
   - Paste into Railway Variables

3. **NODE_ENV** (optional but recommended)
   - Set to: `production`

### How to Set Variables:
1. Railway dashboard → Your service
2. Click **Variables** tab
3. Click **+ New Variable**
4. Add each variable:
   - Name: `DISCORD_TOKEN`
   - Value: `[your-bot-token]`
   - Click **Add**
5. Repeat for `DISCORD_CLIENT_ID` and `NODE_ENV`

## Step 3: Verify Token is Valid

1. Go to https://discord.com/developers/applications
2. Select your bot application
3. Go to **Bot** tab
4. Check:
   - ✅ **Public Bot** is enabled (if you want it in multiple servers)
   - ✅ **Message Content Intent** is enabled (if needed)
   - ✅ **Server Members Intent** is enabled (if using GuildMembers intent)
   - ✅ Token is not expired (reset if needed)

## Step 4: Check Bot Permissions

1. Go to https://discord.com/developers/applications
2. Select your bot → **OAuth2** → **URL Generator**
3. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
4. Select bot permissions:
   - ✅ Send Messages
   - ✅ Use Slash Commands
   - ✅ Read Message History
5. Copy the generated URL
6. Open in browser and invite bot to your server

## Step 5: Common Issues & Solutions

### Issue: "DISCORD_TOKEN is not set"
**Solution:** Add `DISCORD_TOKEN` to Railway Variables

### Issue: "TOKEN_INVALID"
**Solution:** 
- Reset token in Discord Developer Portal
- Update Railway Variables with new token
- Redeploy service

### Issue: "Login successful but bot not online"
**Solution:**
- Check if bot is actually invited to your Discord server
- Verify bot has proper permissions
- Check Railway logs for any errors after login

### Issue: Bot connects then disconnects
**Solution:**
- Check Railway logs for error messages
- Verify network connectivity
- Check if Railway service has enough resources

### Issue: "ENOTFOUND" or "ECONNREFUSED"
**Solution:**
- Network issue - check Railway network settings
- Verify Railway service is running
- Check Railway status page

## Step 6: Test Locally (Optional)

To test if the bot works locally:

1. Create `.env` file in `ace-prime/` directory:
   ```
   DISCORD_TOKEN=your_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   NODE_ENV=development
   ```

2. Run:
   ```bash
   cd ace-prime
   npm install
   npm start
   ```

3. Check console output for connection status

## Step 7: Check Railway Deployment

1. Railway dashboard → Your service → **Settings**
2. Verify:
   - **Root Directory**: `ace-prime` (if your repo has subdirectory)
   - **Start Command**: `npm start`
   - **Build Command**: Should be `npm install` (not `npm run build`)

3. Check `railway.json` exists in your repo root (or `ace-prime/` if using root directory)

## Still Not Working?

1. **Check Railway Logs** - Look for specific error messages
2. **Verify Token** - Reset and update in Railway
3. **Check Discord Developer Portal** - Ensure bot is enabled
4. **Restart Railway Service** - Sometimes a restart fixes connection issues
5. **Check Railway Status** - Visit status.railway.app

## Expected Log Output (Success)

When everything works, you should see:
```
[BOOT] Starting ACE Prime...
[BOOT] NODE_ENV: production
✅ DISCORD_TOKEN found
✅ DISCORD_CLIENT_ID found: 123456789012345678
🔧 Initializing Discord client...
Loaded command: /hello
Loaded command: /ping
🔐 Attempting to login to Discord...
   Token length: 59 characters
   Token prefix: MTA...
✅ Login successful! Waiting for ready event...
═══════════════════════════════════════
✅ ACE Prime is ONLINE!
   Bot: YourBot#1234 (123456789012345678)
   Servers: 1
   Commands: 2
═══════════════════════════════════════
Registering 2 slash commands...
✅ Slash commands registered globally
```

## Need Help?

If you're still having issues:
1. Copy the full Railway logs
2. Check Discord Developer Portal bot settings
3. Verify all environment variables are set correctly
4. Ensure bot is invited to your server with proper permissions

