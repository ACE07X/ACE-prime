import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { ConsoleLogger } from './utils/logger';
import { SlashCommand } from './bot/commands/types';

// Import commands
import helloCommand from './bot/commands/hello';
import pingCommand from './bot/commands/ping';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

console.log('[BOOT] Starting ACE Prime...');

if (!token) {
  console.error('DISCORD_TOKEN is not set. Bot cannot start.');
  process.exit(1);
}

if (!clientId) {
  console.error('DISCORD_CLIENT_ID is not set. Bot cannot start.');
  process.exit(1);
}

console.log('DISCORD_TOKEN found, initializing Discord client...');

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
  console.log(`ACE Prime logged in as ${client.user?.tag}`);
  await registerSlashCommands();
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

client.on('error', (error: Error) => {
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
