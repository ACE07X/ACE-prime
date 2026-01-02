import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../services/database.js';

export const projectCommand = {
  data: new SlashCommandBuilder()
    .setName('project')
    .setDescription('Manage projects')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new project')
        .addStringOption(opt => 
          opt.setName('name')
            .setDescription('Project name')
            .setRequired(true))
        .addStringOption(opt => 
          opt.setName('description')
            .setDescription('Project description'))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all projects')
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('View project details')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Project name')
            .setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction, persona: string) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId || 'dm';

    if (subcommand === 'create') {
      const name = interaction.options.getString('name', true);
      const description = interaction.options.getString('description') || 'No description';

      try {
        // Check if project already exists
        const existing = await prisma.project.findFirst({
          where: {
            guildId,
            name: name.toLowerCase(),
          },
        });

        if (existing) {
          await interaction.reply({ content: `❌ Project **${name}** already exists!`, ephemeral: true });
          return;
        }

        // Create project in database
        await prisma.project.create({
          data: {
            name: name.toLowerCase(),
            description,
            guildId,
            ownerId: interaction.user.id,
          },
        });

        const reply = persona === 'butler'
          ? `✨ Project **${name}** created, ACE! Ready to assign the team?`
          : `✨ Project **${name}** created successfully!\n\n📝 ${description}`;

        await interaction.reply(reply);
      } catch (error) {
        console.error('Error creating project:', error);
        await interaction.reply({ content: '❌ Failed to create project. Database may not be configured.', ephemeral: true });
      }
    }

    else if (subcommand === 'list') {
      try {
        const guildProjects = await prisma.project.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
        });

        if (guildProjects.length === 0) {
          await interaction.reply('📂 No projects yet. Create one with `/project create`');
          return;
        }

        const list = guildProjects.map(p => `• **${p.name}** - ${p.description}`).join('\n');
        await interaction.reply(`📂 **Projects:**\n${list}`);
      } catch (error) {
        console.error('Error listing projects:', error);
        await interaction.reply({ content: '❌ Failed to list projects. Database may not be configured.', ephemeral: true });
      }
    }

    else if (subcommand === 'info') {
      const name = interaction.options.getString('name', true);

      try {
        const project = await prisma.project.findFirst({
          where: {
            guildId,
            name: name.toLowerCase(),
          },
        });

        if (!project) {
          await interaction.reply({ content: `❌ Project **${name}** not found.`, ephemeral: true });
          return;
        }

        await interaction.reply(
          `📋 **${project.name}**\n` +
          `📝 ${project.description}\n` +
          `👤 Owner: <@${project.ownerId}>\n` +
          `📅 Created: <t:${Math.floor(project.createdAt.getTime() / 1000)}:R>`
        );
      } catch (error) {
        console.error('Error getting project info:', error);
        await interaction.reply({ content: '❌ Failed to get project info. Database may not be configured.', ephemeral: true });
      }
    }
  },
};
