import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('hello')
  .setDescription('Say hello to ACE Prime');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply('Hello! 👋 I\'m ACE Prime, your AI assistant. How can I help you today?');
}

