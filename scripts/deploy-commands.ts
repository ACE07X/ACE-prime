import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const TOKEN = process.env['DISCORD_BOT_TOKEN'] || process.env['DISCORD_TOKEN'];
const CLIENT_ID = process.env['DISCORD_CLIENT_ID'];

if (!TOKEN) {
  console.error('DISCORD_BOT_TOKEN or DISCORD_TOKEN is not set.');
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error('DISCORD_CLIENT_ID is not set.');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to ACE Prime'),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function deploy() {
  try {
    console.log(`🚀 Registering ${commands.length} slash commands...`);

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands.map(cmd => cmd.toJSON()) }
    );

    console.log('✅ Slash commands registered globally!');
    console.log('Commands:', commands.map(c => `/${c.name}`).join(', '));
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
}

deploy();

