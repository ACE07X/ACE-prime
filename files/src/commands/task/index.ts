/**
 * Ultra ACE - Task Commands
 * Discord slash commands for task management
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { taskService, projectService } from '../../services';
import { log } from '../../utils/logger';
import type { Command, TaskStatus, TaskPriority, TaskType } from '../../types';

const STATUS_EMOJIS: Record<TaskStatus, string> = {
  backlog: '📋',
  todo: '📝',
  in_progress: '🔄',
  review: '👀',
  done: '✅',
  cancelled: '❌',
};

const PRIORITY_COLORS: Record<TaskPriority, number> = {
  low: 0x2ecc71,
  medium: 0xf39c12,
  high: 0xe74c3c,
  urgent: 0x9b59b6,
};

export const taskCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('task')
    .setDescription('Manage tasks')
    .addSubcommand(sub =>
      sub.setName('create').setDescription('Create a new task')
        .addStringOption(opt => opt.setName('title').setDescription('Task title').setRequired(true).setMaxLength(200))
        .addStringOption(opt => opt.setName('project').setDescription('Project name').setRequired(true).setAutocomplete(true))
        .addStringOption(opt => opt.setName('description').setDescription('Task description').setRequired(false))
        .addStringOption(opt => opt.setName('priority').setDescription('Task priority').setRequired(false)
          .addChoices({ name: '🟢 Low', value: 'low' }, { name: '🟡 Medium', value: 'medium' }, { name: '🟠 High', value: 'high' }, { name: '🔴 Urgent', value: 'urgent' }))
        .addStringOption(opt => opt.setName('type').setDescription('Task type').setRequired(false)
          .addChoices({ name: '✨ Feature', value: 'feature' }, { name: '🐛 Bug', value: 'bug' }, { name: '🔧 Improvement', value: 'improvement' }))
        .addUserOption(opt => opt.setName('assignee').setDescription('Assign to user').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('assign').setDescription('Assign a task')
        .addStringOption(opt => opt.setName('task').setDescription('Task ID').setRequired(true).setAutocomplete(true))
        .addUserOption(opt => opt.setName('user').setDescription('User to assign').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Update task status')
        .addStringOption(opt => opt.setName('task').setDescription('Task ID').setRequired(true).setAutocomplete(true))
        .addStringOption(opt => opt.setName('status').setDescription('New status').setRequired(true)
          .addChoices({ name: '📋 Backlog', value: 'backlog' }, { name: '📝 To Do', value: 'todo' }, { name: '🔄 In Progress', value: 'in_progress' }, { name: '👀 Review', value: 'review' }, { name: '✅ Done', value: 'done' }))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List tasks')
        .addStringOption(opt => opt.setName('project').setDescription('Project name').setRequired(true).setAutocomplete(true))
        .addStringOption(opt => opt.setName('status').setDescription('Filter by status').setRequired(false)
          .addChoices({ name: '📝 To Do', value: 'todo' }, { name: '🔄 In Progress', value: 'in_progress' }, { name: '👀 Review', value: 'review' }))
    )
    .addSubcommand(sub => sub.setName('my').setDescription('List your assigned tasks'))
    .addSubcommand(sub =>
      sub.setName('board').setDescription('Show kanban board')
        .addStringOption(opt => opt.setName('project').setDescription('Project name').setRequired(true).setAutocomplete(true))
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'create': await handleCreate(interaction); break;
        case 'assign': await handleAssign(interaction); break;
        case 'status': await handleStatus(interaction); break;
        case 'list': await handleList(interaction); break;
        case 'my': await handleMyTasks(interaction); break;
        case 'board': await handleBoard(interaction); break;
        default: await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      log.error('Task command error', err);
      const msg = 'An error occurred while processing your request.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const guildId = interaction.guildId;
    if (!guildId) return interaction.respond([]);

    if (focused.name === 'project') {
      const result = await projectService.list(guildId, { limit: 25 });
      if (!result.success) return interaction.respond([]);
      const filtered = result.data!.projects
        .filter(p => p.name.toLowerCase().includes(focused.value.toLowerCase()))
        .map(p => ({ name: p.name, value: p.name }));
      return interaction.respond(filtered);
    }

    if (focused.name === 'task') {
      const projectName = interaction.options.getString('project');
      if (projectName) {
        const proj = await projectService.getByName(projectName, guildId);
        if (proj.success && proj.data) {
          const tasks = await taskService.listByProject(proj.data.id, { limit: 25 });
          if (tasks.success) {
            const filtered = tasks.data!.tasks
              .filter(t => t.title.toLowerCase().includes(focused.value.toLowerCase()))
              .map(t => ({ name: `${STATUS_EMOJIS[t.status]} ${t.title}`, value: t.id }));
            return interaction.respond(filtered);
          }
        }
      }
    }
    return interaction.respond([]);
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const title = interaction.options.getString('title', true);
  const projectName = interaction.options.getString('project', true);
  const description = interaction.options.getString('description');
  const priority = interaction.options.getString('priority') as TaskPriority | null;
  const type = interaction.options.getString('type') as TaskType | null;
  const assignee = interaction.options.getUser('assignee');

  const proj = await projectService.getByName(projectName, interaction.guildId!);
  if (!proj.success) {
    await interaction.editReply(`❌ Project "${projectName}" not found`);
    return;
  }

  const result = await taskService.create({
    project_id: proj.data!.id,
    title,
    description: description || undefined,
    priority: priority || 'medium',
    type: type || 'feature',
    assignee_id: assignee?.id,
    reporter_id: interaction.user.id,
  });

  if (!result.success) {
    await interaction.editReply(`❌ Failed: ${result.error}`);
    return;
  }

  const task = result.data!;
  const embed = new EmbedBuilder()
    .setTitle('✨ Task Created')
    .setColor(PRIORITY_COLORS[task.priority])
    .addFields(
      { name: 'Title', value: task.title },
      { name: 'Status', value: `${STATUS_EMOJIS[task.status]} ${task.status}`, inline: true },
      { name: 'Priority', value: task.priority, inline: true }
    )
    .setFooter({ text: `ID: ${task.id.substring(0, 8)}` });

  if (task.assignee_id) embed.addFields({ name: 'Assignee', value: `<@${task.assignee_id}>`, inline: true });
  await interaction.editReply({ embeds: [embed] });
}

async function handleAssign(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const taskId = interaction.options.getString('task', true);
  const user = interaction.options.getUser('user', true);
  const result = await taskService.assign(taskId, user.id);
  if (!result.success) {
    await interaction.editReply(`❌ Failed: ${result.error}`);
    return;
  }
  await interaction.editReply(`✅ Assigned **${result.data!.title}** to ${user}`);
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const taskId = interaction.options.getString('task', true);
  const newStatus = interaction.options.getString('status', true) as TaskStatus;
  const result = await taskService.updateStatus(taskId, newStatus);
  if (!result.success) {
    await interaction.editReply(`❌ Failed: ${result.error}`);
    return;
  }
  await interaction.editReply(`✅ **${result.data!.title}** → ${STATUS_EMOJIS[newStatus]} ${newStatus}`);
}

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const projectName = interaction.options.getString('project', true);
  const status = interaction.options.getString('status') as TaskStatus | null;

  const proj = await projectService.getByName(projectName, interaction.guildId!);
  if (!proj.success) {
    await interaction.editReply(`❌ Project not found`);
    return;
  }

  const result = await taskService.listByProject(proj.data!.id, { status: status || undefined, limit: 25 });
  if (!result.success) {
    await interaction.editReply(`❌ Failed: ${result.error}`);
    return;
  }

  const { tasks, total } = result.data!;
  if (tasks.length === 0) {
    await interaction.editReply('No tasks found.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 Tasks - ${projectName}`)
    .setColor(0x3498db)
    .setDescription(tasks.map(t => {
      const assignee = t.assignee_id ? `<@${t.assignee_id}>` : 'unassigned';
      return `${STATUS_EMOJIS[t.status]} **${t.title}**\n└ ${t.priority} • ${assignee}`;
    }).join('\n\n'))
    .setFooter({ text: `${tasks.length}/${total} tasks` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleMyTasks(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const result = await taskService.getAssignedTasks(interaction.user.id);
  if (!result.success) {
    await interaction.editReply(`❌ Failed: ${result.error}`);
    return;
  }
  const tasks = result.data!;
  if (tasks.length === 0) {
    await interaction.editReply('🎉 No assigned tasks!');
    return;
  }
  const embed = new EmbedBuilder()
    .setTitle('📋 Your Tasks')
    .setColor(0x3498db)
    .setDescription(tasks.map(t => `${STATUS_EMOJIS[t.status]} **${t.title}** (${t.priority})`).join('\n'))
    .setFooter({ text: `${tasks.length} tasks` });
  await interaction.editReply({ embeds: [embed] });
}

async function handleBoard(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const projectName = interaction.options.getString('project', true);
  const proj = await projectService.getByName(projectName, interaction.guildId!);
  if (!proj.success) {
    await interaction.editReply(`❌ Project not found`);
    return;
  }
  const stats = await taskService.getProjectStats(proj.data!.id);
  if (!stats.success) {
    await interaction.editReply(`❌ Failed: ${stats.error}`);
    return;
  }
  const s = stats.data!;
  const embed = new EmbedBuilder()
    .setTitle(`📊 Board - ${projectName}`)
    .setColor(0x3498db)
    .addFields(
      { name: '📋 Backlog', value: `${s.by_status.backlog || 0}`, inline: true },
      { name: '📝 To Do', value: `${s.by_status.todo || 0}`, inline: true },
      { name: '🔄 In Progress', value: `${s.by_status.in_progress || 0}`, inline: true },
      { name: '👀 Review', value: `${s.by_status.review || 0}`, inline: true },
      { name: '✅ Done', value: `${s.by_status.done || 0}`, inline: true },
      { name: '📈 Summary', value: `Total: ${s.total} • Overdue: ${s.overdue} • Unassigned: ${s.unassigned}` }
    );
  await interaction.editReply({ embeds: [embed] });
}

export default taskCommand;
