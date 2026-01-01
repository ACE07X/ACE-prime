import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { ConsoleLogger } from './utils/logger';
import { SlashCommand } from './bot/commands/types';

// Import commands
import helloCommand from './bot/commands/hello';
import pingCommand from './bot/commands/ping';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const nodeEnv = process.env.NODE_ENV || 'development';

console.log('[BOOT] Starting ACE Prime...');
console.log(`[BOOT] NODE_ENV: ${nodeEnv}`);

// Validate environment variables
if (!token) {
  console.error('❌ DISCORD_TOKEN is not set. Bot cannot start.');
  console.error('   Please set DISCORD_TOKEN in Railway environment variables.');
  process.exit(1);
}

if (!clientId) {
  console.error('❌ DISCORD_CLIENT_ID is not set. Bot cannot start.');
  console.error('   Please set DISCORD_CLIENT_ID in Railway environment variables.');
  process.exit(1);
}

// Validate token format (Discord tokens start with specific prefixes)
if (!token.match(/^[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}$/)) {
  console.warn('⚠️  DISCORD_TOKEN format looks invalid. Token should be a valid Discord bot token.');
  console.warn('   Token format: MTA... or NTA... followed by base64 characters');
}

console.log('✅ DISCORD_TOKEN found');
console.log(`✅ DISCORD_CLIENT_ID found: ${clientId}`);
console.log('🔧 Initializing Discord client...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
}) as Client & { commands: Collection<string, SlashCommand> };

// Initialize commands collection
client.commands = new Collection<string, SlashCommand>();

// Load commands
const commands: SlashCommand[] = [helloCommand, pingCommand];
for (const command of commands) {
  client.commands.set(command.data.name, command);
  console.log(`Loaded command: /${command.data.name}`);
}

const logger = new ConsoleLogger();

// Register slash commands
async function registerSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(token!);
  const commandData = commands.map(cmd => cmd.data.toJSON());

  try {
    console.log(`Registering ${commandData.length} slash commands...`);
    await rest.put(
      Routes.applicationCommands(clientId!),
      { body: commandData }
    );
    console.log('✅ Slash commands registered globally');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

client.once('ready', async () => {
  console.log('═══════════════════════════════════════');
  console.log('✅ ACE Prime is ONLINE!');
  console.log(`   Bot: ${client.user?.tag} (${client.user?.id})`);
  console.log(`   Servers: ${client.guilds.cache.size}`);
  console.log(`   Commands: ${client.commands.size}`);
  console.log('═══════════════════════════════════════');
  
  try {
    await registerSlashCommands();
  } catch (error) {
    console.error('❌ Failed to register commands on ready:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error: unknown) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true }).catch(() => {});
  }
});

// Discord client event handlers
client.on('error', (error: Error) => {
  console.error('❌ Discord client error:', error.message);
  console.error('   Stack:', error.stack);
  logger.error('Discord client error', {
    error: error.message,
    stack: error.stack,
  });
});

client.on('warn', (warning: string) => {
  console.warn('⚠️  Discord client warning:', warning);
});

client.on('debug', (info: string) => {
  if (nodeEnv === 'development') {
    console.debug('[DEBUG]', info);
  }
});

client.on('disconnect', () => {
  console.warn('⚠️  Bot disconnected from Discord. Will attempt to reconnect...');
});

client.on('reconnecting', () => {
  console.log('🔄 Reconnecting to Discord...');
});

client.on('shardError', (error: Error) => {
  console.error('❌ Shard error:', error.message);
  console.error('   Stack:', error.stack);
});

// Handle unhandled errors
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('   Reason:', reason);
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('   Stack:', error.stack);
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  // Don't exit immediately - let Railway handle restart
  setTimeout(() => process.exit(1), 1000);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT. Shutting down ACE Prime...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM. Shutting down ACE Prime...');
  client.destroy();
  process.exit(0);
});

// Start the bot
(async () => {
  try {
    console.log('🔐 Attempting to login to Discord...');
    console.log(`   Token length: ${token?.length} characters`);
    console.log(`   Token prefix: ${token?.substring(0, 3)}...`);
    
    await client.login(token);
    
    // If login succeeds, the 'ready' event will fire
    console.log('✅ Login successful! Waiting for ready event...');
  } catch (err) {
    const error = err as Error;
    console.error('❌ Discord login failed!');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.message.includes('TOKEN_INVALID')) {
      console.error('   → The Discord token is invalid. Please check DISCORD_TOKEN in Railway.');
    } else if (error.message.includes('TOKEN_MISSING')) {
      console.error('   → The Discord token is missing. Please set DISCORD_TOKEN in Railway.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('   → Network error. Check Railway network settings.');
    }
    
    logger.error('Discord login failed', {
      error: error.message,
      stack: error.stack,
    });
    
    process.exit(1);
  }
})();
