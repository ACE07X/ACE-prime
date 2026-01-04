/**
 * Ultra ACE - Note Commands
 * Discord slash commands for notes and decisions
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { noteService, projectService } from '../../services';
import { log } from '../../utils/logger';
import type { Command, NoteType } from '../../types';

const TYPE_EMOJIS: Record<NoteType, string> = {
  general: '📝',
  decision: '⚖️',
  meeting: '📅',
  idea: '💡',
  blocker: '🚫',
  reference: '📚',
};

export const noteCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Manage notes and decisions')
    .addSubcommand(sub =>
      sub.setName('save').setDescription('Save a new note')
        .addStringOption(opt => opt.setName('title').setDescription('Note title').setRequired(true).setMaxLength(200))
        .addStringOption(opt => opt.setName('content').setDescription('Note content').setRequired(true).setMaxLength(2000))
        .addStringOption(opt => opt.setName('type').setDescription('Note type').setRequired(false)
          .addChoices(
            { name: '📝 General', value: 'general' },
            { name: '⚖️ Decision', value: 'decision' },
            { name: '📅 Meeting', value: 'meeting' },
            { name: '💡 Idea', value: 'idea' },
            { name: '🚫 Blocker', value: 'blocker' },
            { name: '📚 Reference', value: 'reference' }
          ))
        .addStringOption(opt => opt.setName('project').setDescription('Link to project').setRequired(false).setAutocomplete(true))
        .addStringOption(opt => opt.setName('tags').setDescription('Tags (comma-separated)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List notes')
        .addStringOption(opt => opt.setName('project').setDescription('Filter by project').setRequired(false).setAutocomplete(true))
        .addStringOption(opt => opt.setName('type').setDescription('Filter by type').setRequired(false)
          .addChoices(
            { name: '📝 General', value: 'general' },
            { name: '⚖️ Decision', value: 'decision' },
            { name: '📅 Meeting', value: 'meeting' },
            { name: '💡 Idea', value: 'idea' }
          ))
    )
    .addSubcommand(sub =>
      sub.setName('search').setDescription('Search notes')
        .addStringOption(opt => opt.setName('query').setDescription('Search query').setRequired(true))
        .addStringOption(opt => opt.setName('project').setDescription('Limit to project').setRequired(false).setAutocomplete(true))
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View a note')
        .addStringOption(opt => opt.setName('id').setDescription('Note ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('pin').setDescription('Pin/unpin a note')
        .addStringOption(opt => opt.setName('id').setDescription('Note ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('decisions').setDescription('List all decisions')
        .addStringOption(opt => opt.setName('project').setDescription('Project name').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete').setDescription('Delete a note')
        .addStringOption(opt => opt.setName('id').setDescription('Note ID').setRequired(true))
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'save': await handleSave(interaction); break;
        case 'list': await handleList(interaction); break;
        case 'search': await handleSearch(interaction); break;
        case 'view': await handleView(interaction); break;
        case 'pin': await handlePin(interaction); break;
        case 'decisions': await handleDecisions(interaction); break;
        case 'delete': await handleDelete(interaction); break;
        default: await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      log.error('Note command error', err);
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
    return interaction.respond([]);
  },
};

async function handleSave(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const title = interaction.options.getString('title', true);
  const content = interaction.options.getString('content', true);
  const type = (interaction.options.getString('type') || 'general') as NoteType;
  const projectName = interaction.options.getString('project');
  const tagsStr = interaction.options.getString('tags');

  let projectId: string | undefined;
  if (projectName) {
    const proj = await projectService.getByName(projectName, interaction.guildId!);
    if (proj.success && proj.data) {
      projectId = proj.data.id;
    }
  }

  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  const result = await noteService.create({
    title,
    content,
    type,
    project_id: projectId,
    channel_id: interaction.channelId,
    author_id: interaction.user.id,
    tags,
  });

  if (!result.success) {
    await interaction.editReply(`❌ Failed: ${result.error}`);
    return;
  }

  const note = result.data!;
  const embed = new EmbedBuilder()
    .setTitle(`${TYPE_EMOJIS[note.type]} Note Saved`)
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Title', value: note.title },
      { name: 'Type', value: note.type, inline: true }
    )
    .setFooter({ text: `ID: ${note.id.substring(0, 8)}` })
    .setTimestamp();

  if (note.tags.length > 0) {
    embed.addFields({ name: 'Tags', value: note.tags.map(t => `\`${t}\``).join(' '), inline: true });
  }

  log.command('note save', interaction.user.id, interaction.guildId!, { title, type });
  await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const projectName = interaction.options.getString('project');
  const type = interaction.options.getString('type') as NoteType | null;

  if (projectName) {
    const proj = await projectService.getByName(projectName, interaction.guildId!);
    if (!proj.success) {
      await interaction.editReply(`❌ Project not found`);
      return;
    }

    const result = await noteService.listByProject(proj.data!.id, { type: type || undefined, limit: 15 });
    if (!result.success) {
      await interaction.editReply(`❌ ${result.error}`);
      return;
    }

    const { notes, total } = result.data!;
    if (notes.length === 0) {
      await interaction.editReply('No notes found.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📝 Notes - ${projectName}`)
      .setColor(0x3498db)
      .setDescription(
        notes.map(n => {
          const pin = n.pinned ? '📌 ' : '';
          return `${pin}${TYPE_EMOJIS[n.type]} **${n.title}**\n└ ${n.content.substring(0, 80)}...`;
        }).join('\n\n')
      )
      .setFooter({ text: `${notes.length}/${total} notes` });

    await interaction.editReply({ embeds: [embed] });
  } else {
    const result = await noteService.listByChannel(interaction.channelId, { limit: 15 });
    if (!result.success) {
      await interaction.editReply(`❌ ${result.error}`);
      return;
    }

    const { notes, total } = result.data!;
    if (notes.length === 0) {
      await interaction.editReply('No notes in this channel.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📝 Channel Notes')
      .setColor(0x3498db)
      .setDescription(
        notes.map(n => `${TYPE_EMOJIS[n.type]} **${n.title}** - ${n.content.substring(0, 50)}...`).join('\n')
      )
      .setFooter({ text: `${notes.length}/${total} notes` });

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleSearch(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const query = interaction.options.getString('query', true);
  const projectName = interaction.options.getString('project');

  let projectId: string | undefined;
  if (projectName) {
    const proj = await projectService.getByName(projectName, interaction.guildId!);
    if (proj.success && proj.data) {
      projectId = proj.data.id;
    }
  }

  const result = await noteService.search(interaction.guildId!, query, { projectId });

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const notes = result.data!;
  if (notes.length === 0) {
    await interaction.editReply(`No notes found for "${query}"`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 Search Results: "${query}"`)
    .setColor(0x3498db)
    .setDescription(
      notes.map(n => `${TYPE_EMOJIS[n.type]} **${n.title}**\n└ ...${n.content.substring(0, 100)}...`).join('\n\n')
    )
    .setFooter({ text: `${notes.length} results` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleView(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const noteId = interaction.options.getString('id', true);
  const result = await noteService.getById(noteId);

  if (!result.success) {
    await interaction.editReply(`❌ Note not found`);
    return;
  }

  const note = result.data!;
  const embed = new EmbedBuilder()
    .setTitle(`${TYPE_EMOJIS[note.type]} ${note.title}`)
    .setColor(note.pinned ? 0xf39c12 : 0x3498db)
    .setDescription(note.content)
    .addFields(
      { name: 'Type', value: note.type, inline: true },
      { name: 'Author', value: `<@${note.author_id}>`, inline: true }
    )
    .setFooter({ text: `ID: ${note.id.substring(0, 8)} • ${note.pinned ? '📌 Pinned' : ''}` })
    .setTimestamp(new Date(note.created_at));

  if (note.tags.length > 0) {
    embed.addFields({ name: 'Tags', value: note.tags.map(t => `\`${t}\``).join(' ') });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handlePin(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const noteId = interaction.options.getString('id', true);
  const result = await noteService.togglePin(noteId);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const note = result.data!;
  const status = note.pinned ? '📌 Pinned' : 'Unpinned';
  await interaction.editReply(`✅ **${note.title}** has been ${status}`);
}

async function handleDecisions(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const projectName = interaction.options.getString('project', true);
  const proj = await projectService.getByName(projectName, interaction.guildId!);

  if (!proj.success) {
    await interaction.editReply(`❌ Project not found`);
    return;
  }

  const result = await noteService.getDecisions(proj.data!.id);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const decisions = result.data!;
  if (decisions.length === 0) {
    await interaction.editReply(`No decisions recorded for ${projectName}. Use \`/note save\` with type "Decision" to record one.`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`⚖️ Decisions - ${projectName}`)
    .setColor(0x9b59b6)
    .setDescription(
      decisions.map((d, i) => 
        `**${i + 1}. ${d.title}**\n${d.content.substring(0, 150)}${d.content.length > 150 ? '...' : ''}\n_${new Date(d.created_at).toLocaleDateString()}_`
      ).join('\n\n')
    )
    .setFooter({ text: `${decisions.length} decisions recorded` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const noteId = interaction.options.getString('id', true);
  
  // First get the note to check ownership
  const noteResult = await noteService.getById(noteId);
  if (!noteResult.success) {
    await interaction.editReply(`❌ Note not found`);
    return;
  }

  if (noteResult.data!.author_id !== interaction.user.id) {
    await interaction.editReply(`❌ You can only delete your own notes`);
    return;
  }

  const result = await noteService.delete(noteId);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  await interaction.editReply(`✅ Note deleted`);
}

export default noteCommand;
