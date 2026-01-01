# Railway Deployment Guide

ACE Prime is configured to run on Railway without requiring a `.env` file. Environment variables are injected automatically by Railway.

## Environment Variables

### Required

- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application client ID

### Optional

- `OPENAI_API_KEY` - OpenAI API key (bot runs in fallback mode if not set)
- `OPENAI_MODEL` - OpenAI model to use (defaults to `gpt-4`)
- `NODE_ENV` - Set to `production` on Railway

## Railway Setup

1. **Connect your repository** to Railway
2. **Add environment variables** in Railway dashboard:
   - Go to your service → Variables
   - Add `DISCORD_TOKEN` with your bot token
   - Add `DISCORD_CLIENT_ID` with your Discord application client ID
   - (Optional) Add `OPENAI_API_KEY` if you want AI responses
   - Add `NODE_ENV=production`

3. **Deploy** - Railway will automatically:
   - Install dependencies (`npm install`)
   - Start the bot (`npm start` → `tsx src/index.ts`)
   - **Note:** No build step required - TypeScript runs directly via `tsx`

## Local Development

1. Create a `.env` file in the `ace-prime` directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_client_id_here
   OPENAI_API_KEY=your_openai_api_key_here
   NODE_ENV=development
   ```

2. Run the bot:
   ```bash
   npm run dev
   ```

## Error Handling

- If `DISCORD_TOKEN` is missing, the bot will log: **"DISCORD_TOKEN is not set. Bot cannot start."** and exit safely
- If `DISCORD_CLIENT_ID` is missing, the bot will log: **"DISCORD_CLIENT_ID is not set. Bot cannot start."** and exit safely
- If `OPENAI_API_KEY` is missing, the bot will run in fallback mode and respond with: "ACE Prime is online. AI responses are currently disabled."
- The bot will not crash during startup if environment variables are missing (except DISCORD_TOKEN and DISCORD_CLIENT_ID which are required)

## Notes

- `.env` files are gitignored and never committed
- `.env.example` is a template only and contains no real values
- Environment variables are accessed using dot notation (`process.env.KEY`)
- `tsx` is included as a production dependency to run TypeScript directly
- `dotenv.config()` is safe and does not throw if `.env` is missing

