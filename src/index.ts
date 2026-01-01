import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { MessageHandler } from './events/MessageHandler';
import { ConsoleLogger } from './utils/logger';
import { SYSTEM_CONSTANTS } from './config/constants';

// Load environment variables from .env file (if it exists)
// This is safe - dotenv.config() does not throw if .env is missing
// On Railway, environment variables are injected automatically
dotenv.config();

/**
 * Main entry point for ACE Prime Discord bot.
 * 
 * Initializes Discord client and sets up message handling.
 * 
 * Environment Variables:
 * - DISCORD_TOKEN: Required - Discord bot token
 * - OPENAI_API_KEY: Optional - OpenAI API key (bot runs in fallback mode if missing)
 * - NODE_ENV: Optional - Set to 'production' on Railway
 */
async function main() {
  const logger = new ConsoleLogger();

  logger.info('Starting ACE Prime...', {
    version: SYSTEM_CONSTANTS.VERSION,
    botName: SYSTEM_CONSTANTS.BOT_NAME,
  });

  // Startup guard: Validate Discord token is set
  // Runtime check only - this runs when the app starts, not during build
  // Use bracket notation for safe access
  const discordToken = process.env['DISCORD_TOKEN'];
  if (!discordToken || discordToken.trim().length === 0) {
    // Use console.error to match exact requirement
    console.error('DISCORD_TOKEN is not set. Bot cannot start.');
    process.exit(1);
  }

  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Initialize message handler
  const messageHandler = new MessageHandler(logger);

  // Set up event handlers
  client.once('ready', () => {
    logger.info('ACE Prime is online and ready!', {
      botName: client.user?.tag,
      botId: client.user?.id,
      guildCount: client.guilds.cache.size,
    });
  });

  client.on('messageCreate', async (message) => {
    await messageHandler.handleMessage(message);
  });

  client.on('error', (error) => {
    logger.error('Discord client error', {
      error: error.message,
      stack: error.stack,
    });
  });

  // Handle process termination
  process.on('SIGINT', () => {
    logger.info('Shutting down ACE Prime...');
    client.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down ACE Prime...');
    client.destroy();
    process.exit(0);
  });

  // Login to Discord
  try {
    await client.login(discordToken);
  } catch (error) {
    logger.error('Failed to login to Discord', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

// Run the bot
main().catch((error) => {
  console.error('Fatal error starting ACE Prime:', error);
  process.exit(1);
});

