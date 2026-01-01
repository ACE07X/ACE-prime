import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { MessageHandler } from './events/MessageHandler';
import { ConsoleLogger } from './utils/logger';

const token = process.env['DISCORD_BOT_TOKEN'];

console.log('[BOOT] Starting ACE Prime...');

if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set. Bot cannot start.');
  process.exit(1);
}

console.log('DISCORD_BOT_TOKEN found, initializing Discord client...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const logger = new ConsoleLogger();
const messageHandler = new MessageHandler(logger);

client.once('ready', () => {
  console.log(`ACE Prime logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  await messageHandler.handleMessage(message);
});

client.on('error', (error) => {
  console.error('Discord client error:', error.message);
  logger.error('Discord client error', {
    error: error.message,
    stack: error.stack,
  });
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down ACE Prime...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down ACE Prime...');
  client.destroy();
  process.exit(0);
});

(async () => {
  try {
    console.log('Attempting to login to Discord...');
    await client.login(token);
  } catch (err) {
    console.error('Discord login failed:', err);
    process.exit(1);
  }
})();
