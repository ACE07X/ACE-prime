import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { MessageHandler } from './events/MessageHandler';
import { ConsoleLogger } from './utils/logger';

// Import commands
import * as helloCommand from './bot/commands/hello';
import * as pingCommand from './bot/commands/ping';

const token = process.env['DISCORD_BOT_TOKEN'];
const clientId = process.env['DISCORD_CLIENT_ID'];

console.log('[BOOT] Starting ACE Prime...');

if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set. Bot cannot start.');
  process.exit(1);
}

if (!clientId) {
  console.error('DISCORD_CLIENT_ID is not set. Bot cannot start.');
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
}) as Client & { commands: Collection<string, any> };

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commands = [helloCommand, pingCommand];
for (const cmd of commands) {
  const command = 'default' in cmd ? cmd.default : cmd;
  if (command && command.data) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: /${command.data.name}`);
  }
}

const logger = new ConsoleLogger();
const messageHandler = new MessageHandler(logger);

// Register slash commands
async function registerSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(token!);
  const commandData = commands.map(cmd => {
    const command = 'default' in cmd ? cmd.default : cmd;
    if (command && command.data) {
      return command.data.toJSON();
    }
    return null;
  }).filter((cmd): cmd is any => cmd !== null);

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
  console.log(`ACE Prime logged in as ${client.user?.tag}`);
  await registerSlashCommands();
});

client.on('interactionCreate', async (interaction: any) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true }).catch(() => {});
  }
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
