# Railway Deployment Guide

ACE Prime is configured to run on Railway without requiring a `.env` file. Environment variables are injected automatically by Railway.

## Environment Variables

### Required

- `DISCORD_TOKEN` - Your Discord bot token

### Optional

- `OPENAI_API_KEY` - OpenAI API key (bot runs in fallback mode if not set)
- `OPENAI_MODEL` - OpenAI model to use (defaults to `gpt-4`)
- `NODE_ENV` - Set to `production` on Railway

## Railway Setup

1. **Connect your repository** to Railway
2. **Add environment variables** in Railway dashboard:
   - Go to your service → Variables
   - Add `DISCORD_TOKEN` with your bot token
   - (Optional) Add `OPENAI_API_KEY` if you want AI responses
   - Add `NODE_ENV=production`

3. **Deploy** - Railway will automatically:
   - Install dependencies (`npm install`)
   - Build the project (`npm run build`)
   - Start the bot (`npm start`)

## Local Development

1. Create a `.env` file in the `ace-prime` directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   NODE_ENV=development
   ```

2. Run the bot:
   ```bash
   npm run dev
   ```

## Error Handling

- If `DISCORD_TOKEN` is missing, the bot will log: **"DISCORD_TOKEN is not set. Bot cannot start."** and exit safely
- If `OPENAI_API_KEY` is missing, the bot will run in fallback mode and respond with: "ACE Prime is online. AI responses are currently disabled."
- The bot will not crash during build or startup if environment variables are missing (except DISCORD_TOKEN which is required)

## Notes

- `.env` files are gitignored and never committed
- `.env.example` is a template only and contains no real values
- All environment variable access uses bracket notation (`process.env['KEY']`) for safety
- `dotenv.config()` is safe and does not throw if `.env` is missing

