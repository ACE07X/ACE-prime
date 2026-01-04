/**
 * Ultra ACE - Project Commands
 * Discord slash commands for project management
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { projectService } from '../../services';
import { log } from '../../utils/logger';
import type { Command, ProjectStatus, ProjectPriority } from '../../types';

const STATUS_COLORS: Record<ProjectStatus, number> = {
  planning: 0x3498db,    // Blue
  active: 0x2ecc71,      // Green
  paused: 0xf39c12,      // Orange
  completed: 0x9b59b6,   // Purple
  archived: 0x95a5a6,    // Gray
};

const PRIORITY_EMOJIS: Record<ProjectPriority, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
};

export const projectCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('project')
    .setDescription('Manage projects')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a new project')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Project name')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(opt =>
          opt
            .setName('description')
            .setDescription('Project description')
            .setRequired(false)
            .setMaxLength(500)
        )
        .addStringOption(opt =>
          opt
            .setName('priority')
            .setDescription('Project priority')
            .setRequired(false)
            .addChoices(
              { name: '🟢 Low', value: 'low' },
              { name: '🟡 Medium', value: 'medium' },
              { name: '🟠 High', value: 'high' },
              { name: '🔴 Critical', value: 'critical' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('github')
            .setDescription('GitHub repository name')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all projects')
        .addStringOption(opt =>
          opt
            .setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: '📋 Planning', value: 'planning' },
              { name: '🚀 Active', value: 'active' },
              { name: '⏸️ Paused', value: 'paused' },
              { name: '✅ Completed', value: 'completed' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View project details')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Project name')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Update project status')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Project name')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt
            .setName('status')
            .setDescription('New status')
            .setRequired(true)
            .addChoices(
              { name: '📋 Planning', value: 'planning' },
              { name: '🚀 Active', value: 'active' },
              { name: '⏸️ Paused', value: 'paused' },
              { name: '✅ Completed', value: 'completed' },
              { name: '📦 Archived', value: 'archived' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('link')
        .setDescription('Link project to current channel')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Project name')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('github')
        .setDescription('Link GitHub repository')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Project name')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt
            .setName('repo')
            .setDescription('GitHub repository name')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Archive/delete a project')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Project name')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addBooleanOption(opt =>
          opt
            .setName('permanent')
            .setDescription('Permanently delete (cannot be undone)')
            .setRequired(false)
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'create':
          await handleCreate(interaction);
          break;
        case 'list':
          await handleList(interaction);
          break;
        case 'view':
          await handleView(interaction);
          break;
        case 'status':
          await handleStatus(interaction);
          break;
        case 'link':
          await handleLink(interaction);
          break;
        case 'github':
          await handleGitHub(interaction);
          break;
        case 'delete':
          await handleDelete(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      log.error('Project command error', err);
      const message = 'An error occurred while processing your request.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: message, ephemeral: true });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }
  },

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'name') {
      const guildId = interaction.guildId;
      if (!guildId) return interaction.respond([]);

      const result = await projectService.list(guildId, { limit: 25 });
      
      if (!result.success || !result.data) {
        return interaction.respond([]);
      }

      const filtered = result.data.projects
        .filter(p => p.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
        .slice(0, 25)
        .map(p => ({ name: `${p.name} (${p.status})`, value: p.name }));

      return interaction.respond(filtered);
    }
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const description = interaction.options.getString('description');
  const priority = interaction.options.getString('priority') as ProjectPriority | null;
  const githubRepo = interaction.options.getString('github');

  const result = await projectService.create({
    name,
    description: description || undefined,
    priority: priority || 'medium',
    guild_id: interaction.guildId!,
    channel_id: interaction.channelId,
    github_repo: githubRepo || undefined,
    owner_id: interaction.user.id,
  });

  if (!result.success) {
    await interaction.editReply(`❌ Failed to create project: ${result.error}`);
    return;
  }

  const project = result.data!;
  const embed = new EmbedBuilder()
    .setTitle('✨ Project Created')
    .setColor(STATUS_COLORS[project.status])
    .addFields(
      { name: 'Name', value: project.name, inline: true },
      { name: 'Status', value: project.status, inline: true },
      { name: 'Priority', value: `${PRIORITY_EMOJIS[project.priority]} ${project.priority}`, inline: true }
    )
    .setFooter({ text: `Project ID: ${project.id}` })
    .setTimestamp();

  if (project.description) {
    embed.setDescription(project.description);
  }

  if (project.github_repo) {
    embed.addFields({ name: 'GitHub', value: project.github_repo, inline: true });
  }

  log.command('project create', interaction.user.id, interaction.guildId!, { projectName: name });
  await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const statusFilter = interaction.options.getString('status') as ProjectStatus | null;

  const result = await projectService.list(interaction.guildId!, {
    status: statusFilter || undefined,
    limit: 25,
  });

  if (!result.success) {
    await interaction.editReply(`❌ Failed to list projects: ${result.error}`);
    return;
  }

  const { projects, total } = result.data!;

  if (projects.length === 0) {
    await interaction.editReply('No projects found. Create one with `/project create`');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📁 Projects')
    .setColor(0x3498db)
    .setDescription(
      projects.map(p => 
        `**${p.name}** - ${p.status} ${PRIORITY_EMOJIS[p.priority]}\n` +
        `${p.description ? p.description.substring(0, 100) + '...' : 'No description'}`
      ).join('\n\n')
    )
    .setFooter({ text: `Showing ${projects.length} of ${total} projects` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleView(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const result = await projectService.getByName(name, interaction.guildId!);

  if (!result.success || !result.data) {
    await interaction.editReply(`❌ Project "${name}" not found`);
    return;
  }

  const project = result.data;
  const embed = new EmbedBuilder()
    .setTitle(`📁 ${project.name}`)
    .setColor(STATUS_COLORS[project.status])
    .addFields(
      { name: 'Status', value: project.status, inline: true },
      { name: 'Priority', value: `${PRIORITY_EMOJIS[project.priority]} ${project.priority}`, inline: true },
      { name: 'Owner', value: `<@${project.owner_id}>`, inline: true }
    )
    .setFooter({ text: `Created: ${new Date(project.created_at).toLocaleDateString()}` })
    .setTimestamp(new Date(project.updated_at));

  if (project.description) {
    embed.setDescription(project.description);
  }

  if (project.github_repo) {
    embed.addFields({ name: '🔗 GitHub', value: project.github_repo, inline: true });
  }

  if (project.channel_id) {
    embed.addFields({ name: '💬 Channel', value: `<#${project.channel_id}>`, inline: true });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const newStatus = interaction.options.getString('status', true) as ProjectStatus;

  const projectResult = await projectService.getByName(name, interaction.guildId!);
  if (!projectResult.success || !projectResult.data) {
    await interaction.editReply(`❌ Project "${name}" not found`);
    return;
  }

  const result = await projectService.updateStatus(projectResult.data.id, newStatus);

  if (!result.success) {
    await interaction.editReply(`❌ Failed to update status: ${result.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('✅ Status Updated')
    .setColor(STATUS_COLORS[newStatus])
    .setDescription(`**${name}** is now **${newStatus}**`)
    .setTimestamp();

  log.command('project status', interaction.user.id, interaction.guildId!, { projectName: name, newStatus });
  await interaction.editReply({ embeds: [embed] });
}

async function handleLink(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const projectResult = await projectService.getByName(name, interaction.guildId!);

  if (!projectResult.success || !projectResult.data) {
    await interaction.editReply(`❌ Project "${name}" not found`);
    return;
  }

  const result = await projectService.linkChannel(projectResult.data.id, interaction.channelId);

  if (!result.success) {
    await interaction.editReply(`❌ Failed to link channel: ${result.error}`);
    return;
  }

  await interaction.editReply(`✅ Linked **${name}** to this channel. Context will now be project-aware.`);
}

async function handleGitHub(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const name = interaction.options.getString('name', true);
  const repo = interaction.options.getString('repo', true);

  const projectResult = await projectService.getByName(name, interaction.guildId!);
  if (!projectResult.success || !projectResult.data) {
    await interaction.editReply(`❌ Project "${name}" not found`);
    return;
  }

  const result = await projectService.linkGitHub(projectResult.data.id, repo);

  if (!result.success) {
    await interaction.editReply(`❌ Failed to link repository: ${result.error}`);
    return;
  }

  await interaction.editReply(`✅ Linked **${name}** to GitHub repository \`${repo}\``);
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const name = interaction.options.getString('name', true);
  const permanent = interaction.options.getBoolean('permanent') || false;

  const projectResult = await projectService.getByName(name, interaction.guildId!);
  if (!projectResult.success || !projectResult.data) {
    await interaction.editReply(`❌ Project "${name}" not found`);
    return;
  }

  // Check permissions
  const canDelete = await projectService.checkPermission(
    projectResult.data.id,
    interaction.user.id,
    'can_delete'
  );

  if (!canDelete && projectResult.data.owner_id !== interaction.user.id) {
    await interaction.editReply('❌ You do not have permission to delete this project');
    return;
  }

  const result = await projectService.delete(projectResult.data.id, permanent);

  if (!result.success) {
    await interaction.editReply(`❌ Failed to delete project: ${result.error}`);
    return;
  }

  const action = permanent ? 'permanently deleted' : 'archived';
  log.command('project delete', interaction.user.id, interaction.guildId!, { projectName: name, permanent });
  await interaction.editReply(`✅ Project **${name}** has been ${action}`);
}

export default projectCommand;
