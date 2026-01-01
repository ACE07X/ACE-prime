# Environment Setup

To run ACE Prime, you need to create a `.env` file in the `ace-prime` directory with the following variables:

## Required

```env
DISCORD_TOKEN=your_discord_bot_token_here
```

## Optional

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
```

## How to Get Your Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name (e.g., "ACE Prime")
3. Go to the "Bot" section in the left sidebar
4. Click "Add Bot" if you haven't already
5. Under "Token", click "Reset Token" or "Copy" to get your bot token
6. Paste it into your `.env` file as `DISCORD_TOKEN`

## How to Get Your OpenAI API Key (Optional)

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it into your `.env` file as `OPENAI_API_KEY`

**Note:** If you don't provide an OpenAI API key, the bot will still run but will respond with a fallback message: "ACE Prime is online. AI responses are currently disabled."

## Example .env File

Create a file named `.env` in the `ace-prime` directory with:

```env
DISCORD_TOKEN=your_discord_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
```

**Important:** Replace the placeholder values with your actual tokens. Never commit your `.env` file to git.

## After Creating .env

Run the bot with:
```bash
npm run dev
```

