import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import 'dotenv/config';
import { prisma } from './services/database.js';

// Commands
import { helloCommand } from './bot/commands/hello.js';
import { pingCommand } from './bot/commands/ping.js';
import { projectCommand } from './bot/commands/project.js';

// Config
const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const OWNER_ID = process.env.OWNER_DISCORD_ID || '618512174620475394';

// Extend client
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

// All commands
const commands = [helloCommand, pingCommand, projectCommand];

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Load commands into collection
for (const cmd of commands) {
  client.commands.set(cmd.data.name, cmd);
}

// Register slash commands with Discord API
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  
  console.log('🚀 Registering slash commands...');
  
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands.map(cmd => cmd.data.toJSON()) }
  );
  
  console.log('✅ Slash commands registered!');
}

// Ready event
client.once('ready', async () => {
  console.log(`✨ ACE Prime is online as ${client.user?.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.warn('⚠️  Database not connected (continuing without database):', (error as Error).message);
    console.warn('   Bot will continue to run, but project features will be unavailable.');
  }
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Determine persona
  const isOwner = interaction.user.id === OWNER_ID;
  const persona = isOwner ? 'butler' : 'supervisor';

  try {
    await command.execute(interaction, persona);
  } catch (error) {
    console.error('Command error:', error);
    const reply = { content: '❌ Something went wrong!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...');
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

// Start bot
async function start() {
  try {
    await registerCommands();
    await client.login(TOKEN);
  } catch (error) {
    console.error('❌ Failed to start:', error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

start();
