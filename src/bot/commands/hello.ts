import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const helloCommand = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to ACE Prime'),

  async execute(interaction: ChatInputCommandInteraction, persona: string) {
    const greeting = persona === 'butler'
      ? `Hello ACE! 👋 How may I assist you today?`
      : `Hello ${interaction.user.displayName}! 👋 I'm ACE Prime, your project assistant.`;

    await interaction.reply(greeting);
  },
};
