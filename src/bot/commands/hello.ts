import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { SlashCommand } from './types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Hello 👋');
  },
};

export default command;

