# ACE Prime - Discord Bot

Simple Discord bot ready for Railway deployment.

## Features

- `/hello` - Greet the bot
- `/ping` - Check latency
- `/project create` - Create a project
- `/project list` - List projects
- `/project info` - View project details

## Deploy to Railway

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ace-prime.git
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your `ace-prime` repository

### Step 3: Add Environment Variables

In Railway dashboard → Your project → **Variables** tab:

```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_bot_client_id_here
OWNER_DISCORD_ID=618512174620475394
```

**For Database (Optional but Recommended):**
1. Add a **PostgreSQL** service in Railway
2. Railway will automatically provide `DATABASE_URL`
3. Or set `DATABASE_URL` manually if using external database

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for details.

### Step 4: Set Build Command (if needed)

Railway usually auto-detects, but if not:

- **Build Command:** `npm run build`
- **Start Command:** `npm start`

### Step 5: Deploy

Railway will auto-deploy when you push to GitHub.

## Get Your Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. **Bot** tab → Copy **Token** → `DISCORD_TOKEN`
4. **General Information** → Copy **Application ID** → `DISCORD_CLIENT_ID`

## Local Development

```bash
# Install
npm install

# Create .env file
cp env.example .env
# Edit .env with your tokens

# Run
npm run dev
```

## File Structure

```
ace-prime/
├── src/
│   ├── index.ts              # Main entry
│   └── bot/commands/
│       ├── hello.ts          # /hello command
│       ├── ping.ts           # /ping command
│       └── project.ts        # /project commands
├── package.json
├── tsconfig.json
└── env.example
```
