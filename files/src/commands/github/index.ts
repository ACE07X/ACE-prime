/**
 * Ultra ACE - GitHub Commands
 * Discord slash commands for GitHub integration
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { githubService } from '../../services';
import { log } from '../../utils/logger';
import type { Command } from '../../types';

export const githubCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('GitHub integration commands')
    .addSubcommand(sub =>
      sub.setName('pull').setDescription('Pull/clone a repository')
        .addStringOption(opt => opt.setName('repo').setDescription('Repository name').setRequired(true))
        .addStringOption(opt => opt.setName('branch').setDescription('Branch name').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('push').setDescription('Commit and push changes')
        .addStringOption(opt => opt.setName('repo').setDescription('Repository name').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Commit message').setRequired(true))
        .addStringOption(opt => opt.setName('branch').setDescription('Branch name').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Check repository status')
        .addStringOption(opt => opt.setName('repo').setDescription('Repository name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('commits').setDescription('View recent commits')
        .addStringOption(opt => opt.setName('repo').setDescription('Repository name').setRequired(true))
        .addIntegerOption(opt => opt.setName('count').setDescription('Number of commits').setRequired(false).setMinValue(1).setMaxValue(25))
    )
    .addSubcommand(sub =>
      sub.setName('branch').setDescription('Create a new branch')
        .addStringOption(opt => opt.setName('repo').setDescription('Repository name').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('New branch name').setRequired(true))
        .addStringOption(opt => opt.setName('from').setDescription('Source branch').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('prs').setDescription('List pull requests')
        .addStringOption(opt => opt.setName('repo').setDescription('Repository name').setRequired(true))
        .addStringOption(opt => opt.setName('state').setDescription('PR state').setRequired(false)
          .addChoices({ name: 'Open', value: 'open' }, { name: 'Closed', value: 'closed' }, { name: 'All', value: 'all' }))
    )
    .addSubcommand(sub =>
      sub.setName('issues').setDescription('List issues')
        .addStringOption(opt => opt.setName('repo').setDescription('Repository name').setRequired(true))
        .addStringOption(opt => opt.setName('state').setDescription('Issue state').setRequired(false)
          .addChoices({ name: 'Open', value: 'open' }, { name: 'Closed', value: 'closed' }, { name: 'All', value: 'all' }))
    )
    .addSubcommand(sub =>
      sub.setName('repos').setDescription('List organization repositories')
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'pull': await handlePull(interaction); break;
        case 'push': await handlePush(interaction); break;
        case 'status': await handleStatus(interaction); break;
        case 'commits': await handleCommits(interaction); break;
        case 'branch': await handleBranch(interaction); break;
        case 'prs': await handlePRs(interaction); break;
        case 'issues': await handleIssues(interaction); break;
        case 'repos': await handleRepos(interaction); break;
        default: await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      log.error('GitHub command error', err);
      const msg = 'An error occurred while processing your request.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },
};

async function handlePull(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  
  const repo = interaction.options.getString('repo', true);
  const branch = interaction.options.getString('branch');

  const result = await githubService.pull(repo, branch || undefined);

  if (!result.success) {
    await interaction.editReply(`❌ Pull failed: ${result.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('✅ Repository Updated')
    .setColor(0x2ecc71)
    .setDescription(result.message)
    .addFields({ name: 'Branch', value: result.data?.branch || 'main', inline: true });

  if (result.data?.commits && result.data.commits.length > 0) {
    const commitList = result.data.commits.slice(0, 5)
      .map(c => `\`${c.sha}\` ${c.message.substring(0, 50)}`)
      .join('\n');
    embed.addFields({ name: 'Recent Commits', value: commitList });
  }

  log.github('pull', repo, { branch: result.data?.branch });
  await interaction.editReply({ embeds: [embed] });
}

async function handlePush(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const repo = interaction.options.getString('repo', true);
  const message = interaction.options.getString('message', true);
  const branch = interaction.options.getString('branch');

  // First, show confirmation for push
  const confirmEmbed = new EmbedBuilder()
    .setTitle('⚠️ Confirm Push')
    .setColor(0xf39c12)
    .setDescription(`You are about to push changes to **${repo}**`)
    .addFields(
      { name: 'Commit Message', value: message },
      { name: 'Branch', value: branch || 'main' }
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_push')
      .setLabel('✅ Confirm Push')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('cancel_push')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Danger)
  );

  const response = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

  try {
    const confirmation = await response.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id,
      time: 30000,
    });

    if (confirmation.customId === 'cancel_push') {
      await confirmation.update({ content: '❌ Push cancelled', embeds: [], components: [] });
      return;
    }

    await confirmation.update({ content: '🔄 Pushing changes...', embeds: [], components: [] });

    const result = await githubService.push(repo, message, {
      branch: branch || undefined,
      confirmed: true,
    });

    if (!result.success) {
      await interaction.editReply(`❌ Push failed: ${result.error}`);
      return;
    }

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Changes Pushed')
      .setColor(0x2ecc71)
      .setDescription(result.message)
      .addFields(
        { name: 'Commit', value: `\`${result.data?.sha || 'unknown'}\``, inline: true },
        { name: 'Branch', value: result.data?.branch || 'main', inline: true }
      );

    if (result.data?.files_changed && result.data.files_changed.length > 0) {
      const files = result.data.files_changed.slice(0, 10).join('\n');
      successEmbed.addFields({ name: 'Files Changed', value: `\`\`\`\n${files}\n\`\`\`` });
    }

    log.github('push', repo, { sha: result.data?.sha });
    await interaction.editReply({ embeds: [successEmbed] });

  } catch (err) {
    await interaction.editReply({ content: '⏱️ Confirmation timed out. Push cancelled.', embeds: [], components: [] });
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const repo = interaction.options.getString('repo', true);
  const result = await githubService.getLocalStatus(repo);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const status = result.data!;
  const embed = new EmbedBuilder()
    .setTitle(`📊 Repository Status: ${repo}`)
    .setColor(0x3498db)
    .addFields({ name: 'Current Branch', value: status.current, inline: true });

  if (status.staged.length > 0) {
    embed.addFields({ name: '✅ Staged', value: status.staged.slice(0, 10).join('\n'), inline: false });
  }
  if (status.modified.length > 0) {
    embed.addFields({ name: '📝 Modified', value: status.modified.slice(0, 10).join('\n'), inline: false });
  }
  if (status.untracked.length > 0) {
    embed.addFields({ name: '❓ Untracked', value: status.untracked.slice(0, 10).join('\n'), inline: false });
  }

  if (status.staged.length === 0 && status.modified.length === 0 && status.untracked.length === 0) {
    embed.setDescription('Working directory is clean ✨');
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleCommits(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const repo = interaction.options.getString('repo', true);
  const count = interaction.options.getInteger('count') || 10;

  const result = await githubService.getRecentCommits(repo, count);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const commits = result.data!;
  const embed = new EmbedBuilder()
    .setTitle(`📜 Recent Commits: ${repo}`)
    .setColor(0x3498db)
    .setDescription(
      commits.map(c => 
        `\`${c.sha}\` ${c.message.substring(0, 60)}${c.message.length > 60 ? '...' : ''}\n└ ${c.author} • ${new Date(c.date).toLocaleDateString()}`
      ).join('\n\n')
    )
    .setFooter({ text: `Showing ${commits.length} commits` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleBranch(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const repo = interaction.options.getString('repo', true);
  const name = interaction.options.getString('name', true);
  const from = interaction.options.getString('from');

  const result = await githubService.createBranch(repo, name, from || undefined);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🌿 Branch Created')
    .setColor(0x2ecc71)
    .setDescription(result.message)
    .addFields({ name: 'New Branch', value: `\`${name}\``, inline: true });

  log.github('branch:create', repo, { branch: name });
  await interaction.editReply({ embeds: [embed] });
}

async function handlePRs(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const repo = interaction.options.getString('repo', true);
  const state = (interaction.options.getString('state') || 'open') as 'open' | 'closed' | 'all';

  const result = await githubService.listPullRequests(repo, state);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const prs = result.data!;
  if (prs.length === 0) {
    await interaction.editReply(`No ${state} pull requests found.`);
    return;
  }

  const stateEmoji: Record<string, string> = { open: '🟢', closed: '🔴', merged: '🟣' };
  const embed = new EmbedBuilder()
    .setTitle(`🔀 Pull Requests: ${repo}`)
    .setColor(0x3498db)
    .setDescription(
      prs.map(pr => 
        `${stateEmoji[pr.state]} **#${pr.number}** ${pr.title}\n└ by ${pr.author}`
      ).join('\n\n')
    )
    .setFooter({ text: `${prs.length} ${state} PRs` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleIssues(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const repo = interaction.options.getString('repo', true);
  const state = (interaction.options.getString('state') || 'open') as 'open' | 'closed' | 'all';

  const result = await githubService.listIssues(repo, state);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const issues = result.data!;
  if (issues.length === 0) {
    await interaction.editReply(`No ${state} issues found.`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🐛 Issues: ${repo}`)
    .setColor(0x3498db)
    .setDescription(
      issues.map(issue => {
        const labels = issue.labels.length > 0 ? ` [${issue.labels.slice(0, 3).join(', ')}]` : '';
        return `${issue.state === 'open' ? '🟢' : '🔴'} **#${issue.number}** ${issue.title}${labels}`;
      }).join('\n')
    )
    .setFooter({ text: `${issues.length} ${state} issues` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRepos(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const result = await githubService.listRepos();

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const repos = result.data!;
  const embed = new EmbedBuilder()
    .setTitle('📁 Organization Repositories')
    .setColor(0x3498db)
    .setDescription(
      repos.slice(0, 25).map(r => 
        `${r.private ? '🔒' : '🌐'} **${r.name}** (${r.default_branch})`
      ).join('\n')
    )
    .setFooter({ text: `Showing ${Math.min(repos.length, 25)} of ${repos.length} repositories` });

  await interaction.editReply({ embeds: [embed] });
}

export default githubCommand;
