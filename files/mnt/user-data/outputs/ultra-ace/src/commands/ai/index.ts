/**
 * Ultra ACE - AI Commands
 * Discord slash commands for AI assistance
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from 'discord.js';
import { aiService, projectService, memoryService } from '../../services';
import { log } from '../../utils/logger';
import type { Command } from '../../types';

export const aiCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('AI coding assistance')
    .addSubcommand(sub =>
      sub.setName('ask').setDescription('Ask the AI assistant anything')
        .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true).setMaxLength(2000))
    )
    .addSubcommand(sub =>
      sub.setName('debug').setDescription('Debug code with AI help')
        .addStringOption(opt => opt.setName('code').setDescription('The code to debug').setRequired(true))
        .addStringOption(opt => opt.setName('error').setDescription('The error message').setRequired(true))
        .addStringOption(opt => opt.setName('language').setDescription('Programming language').setRequired(false)
          .addChoices(
            { name: 'TypeScript', value: 'typescript' },
            { name: 'JavaScript', value: 'javascript' },
            { name: 'Python', value: 'python' },
            { name: 'Rust', value: 'rust' },
            { name: 'Go', value: 'go' }
          ))
    )
    .addSubcommand(sub =>
      sub.setName('review').setDescription('Review code for improvements')
        .addStringOption(opt => opt.setName('code').setDescription('The code to review').setRequired(true))
        .addStringOption(opt => opt.setName('language').setDescription('Programming language').setRequired(false)
          .addChoices(
            { name: 'TypeScript', value: 'typescript' },
            { name: 'JavaScript', value: 'javascript' },
            { name: 'Python', value: 'python' }
          ))
    )
    .addSubcommand(sub =>
      sub.setName('generate').setDescription('Generate code from description')
        .addStringOption(opt => opt.setName('description').setDescription('What should the code do').setRequired(true))
        .addStringOption(opt => opt.setName('language').setDescription('Programming language').setRequired(false)
          .addChoices(
            { name: 'TypeScript', value: 'typescript' },
            { name: 'JavaScript', value: 'javascript' },
            { name: 'Python', value: 'python' }
          ))
        .addStringOption(opt => opt.setName('style').setDescription('Code style').setRequired(false)
          .addChoices(
            { name: 'Minimal', value: 'minimal' },
            { name: 'Documented', value: 'documented' },
            { name: 'Production', value: 'production' }
          ))
    )
    .addSubcommand(sub =>
      sub.setName('explain').setDescription('Explain code')
        .addStringOption(opt => opt.setName('code').setDescription('The code to explain').setRequired(true))
        .addStringOption(opt => opt.setName('level').setDescription('Explanation level').setRequired(false)
          .addChoices(
            { name: 'Beginner', value: 'beginner' },
            { name: 'Intermediate', value: 'intermediate' },
            { name: 'Advanced', value: 'advanced' }
          ))
    )
    .addSubcommand(sub =>
      sub.setName('architecture').setDescription('Get architecture advice')
        .addStringOption(opt => opt.setName('description').setDescription('Describe your project/feature').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('commit').setDescription('Generate a commit message')
        .addStringOption(opt => opt.setName('changes').setDescription('Describe the changes').setRequired(true))
        .addStringOption(opt => opt.setName('style').setDescription('Commit style').setRequired(false)
          .addChoices(
            { name: 'Conventional', value: 'conventional' },
            { name: 'Simple', value: 'simple' }
          ))
    )
    .addSubcommand(sub =>
      sub.setName('context').setDescription('Manage AI context')
        .addStringOption(opt => opt.setName('action').setDescription('Action').setRequired(true)
          .addChoices(
            { name: 'View', value: 'view' },
            { name: 'Clear', value: 'clear' }
          ))
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'ask': await handleAsk(interaction); break;
        case 'debug': await handleDebug(interaction); break;
        case 'review': await handleReview(interaction); break;
        case 'generate': await handleGenerate(interaction); break;
        case 'explain': await handleExplain(interaction); break;
        case 'architecture': await handleArchitecture(interaction); break;
        case 'commit': await handleCommit(interaction); break;
        case 'context': await handleContext(interaction); break;
        default: await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      log.error('AI command error', err);
      const msg = 'An error occurred while processing your request.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },
};

async function handleAsk(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const question = interaction.options.getString('question', true);

  // Check if channel is linked to a project for context
  const projectResult = await projectService.getByChannelId(interaction.channelId);
  const projectId = projectResult.success && projectResult.data ? projectResult.data.id : undefined;

  const result = await aiService.chat(question, {
    channelId: interaction.channelId,
    projectId,
    userId: interaction.user.id,
    includeContext: true,
  });

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const response = result.data!;
  
  // Handle long responses
  if (response.content.length > 4000) {
    // Split into chunks or send as file
    const buffer = Buffer.from(response.content, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: 'response.md' });
    
    await interaction.editReply({
      content: 'Response was too long, attached as file:',
      files: [attachment],
    });
  } else {
    const embed = new EmbedBuilder()
      .setTitle('🤖 AI Response')
      .setColor(0x5865f2)
      .setDescription(response.content.substring(0, 4000))
      .setFooter({ text: `Tokens: ${response.tokens_used} • Model: ${response.model}` });

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleDebug(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const code = interaction.options.getString('code', true);
  const error = interaction.options.getString('error', true);
  const language = interaction.options.getString('language') || 'typescript';

  const result = await aiService.debugCode(code, error, language);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🐛 Debug Analysis')
    .setColor(0xe74c3c)
    .setDescription(result.data!.content.substring(0, 4000))
    .setFooter({ text: `Language: ${language}` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleReview(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const code = interaction.options.getString('code', true);
  const language = interaction.options.getString('language') || 'typescript';

  const result = await aiService.reviewCode(code, language);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('👀 Code Review')
    .setColor(0x3498db)
    .setDescription(result.data!.content.substring(0, 4000))
    .setFooter({ text: `Language: ${language}` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleGenerate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const description = interaction.options.getString('description', true);
  const language = interaction.options.getString('language') || 'typescript';
  const style = (interaction.options.getString('style') || 'documented') as 'minimal' | 'documented' | 'production';

  const result = await aiService.generateCode(description, language, { style });

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const content = result.data!.content;

  if (content.length > 4000) {
    const buffer = Buffer.from(content, 'utf-8');
    const ext = language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'ts';
    const attachment = new AttachmentBuilder(buffer, { name: `generated.${ext}` });

    await interaction.editReply({
      content: '✨ Generated code:',
      files: [attachment],
    });
  } else {
    const embed = new EmbedBuilder()
      .setTitle('✨ Generated Code')
      .setColor(0x2ecc71)
      .setDescription(content)
      .setFooter({ text: `Language: ${language} • Style: ${style}` });

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleExplain(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const code = interaction.options.getString('code', true);
  const level = (interaction.options.getString('level') || 'intermediate') as 'beginner' | 'intermediate' | 'advanced';

  const result = await aiService.explainCode(code, 'typescript', level);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📖 Code Explanation')
    .setColor(0x9b59b6)
    .setDescription(result.data!.content.substring(0, 4000))
    .setFooter({ text: `Level: ${level}` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleArchitecture(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const description = interaction.options.getString('description', true);

  const result = await aiService.getArchitectureAdvice(description);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const content = result.data!.content;

  if (content.length > 4000) {
    const buffer = Buffer.from(content, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: 'architecture.md' });

    await interaction.editReply({
      content: '🏗️ Architecture advice:',
      files: [attachment],
    });
  } else {
    const embed = new EmbedBuilder()
      .setTitle('🏗️ Architecture Advice')
      .setColor(0xf39c12)
      .setDescription(content);

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleCommit(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const changes = interaction.options.getString('changes', true);
  const style = (interaction.options.getString('style') || 'conventional') as 'conventional' | 'simple';

  const result = await aiService.generateCommitMessage(changes, style);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📝 Suggested Commit Message')
    .setColor(0x2ecc71)
    .setDescription(`\`\`\`\n${result.data}\n\`\`\``)
    .addFields({ name: 'Style', value: style, inline: true })
    .setFooter({ text: 'Copy and use as your commit message' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleContext(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);

  if (action === 'view') {
    await interaction.deferReply({ ephemeral: true });

    const history = await memoryService.getChannelHistory(interaction.channelId, 10);
    
    if (!history.success || !history.data || history.data.length === 0) {
      await interaction.editReply('No context stored for this channel.');
      return;
    }

    const messages = history.data;
    const embed = new EmbedBuilder()
      .setTitle('🧠 Channel Context')
      .setColor(0x5865f2)
      .setDescription(
        messages.slice(-10).map(m => {
          const role = m.role === 'user' ? '👤' : '🤖';
          return `${role} ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`;
        }).join('\n\n')
      )
      .setFooter({ text: `${messages.length} messages in context` });

    await interaction.editReply({ embeds: [embed] });

  } else if (action === 'clear') {
    await interaction.deferReply({ ephemeral: true });

    const result = await memoryService.clearChannelContext(interaction.channelId);
    
    if (!result.success) {
      await interaction.editReply(`❌ ${result.error}`);
      return;
    }

    await interaction.editReply('✅ Channel context cleared. AI will start fresh.');
  }
}

export default aiCommand;
