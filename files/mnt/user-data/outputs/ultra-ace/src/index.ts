/**
 * Ultra ACE - Main Entry Point
 * SoulTech Discord AI Project Manager Bot
 * 
 * ACTIVATION RULES:
 * 1. Slash commands starting with /ace (or other registered commands)
 * 2. Messages starting with prefix !ace
 * 3. Direct mention @UltraACE
 * 4. Active session mode (/ace session start)
 */

import { Client, GatewayIntentBits, Events, ActivityType, Message } from 'discord.js';
import { config as dotenvConfig } from 'dotenv';
import { log } from './utils/logger';
import { loadCommands, registerCommands } from './commands';
import { database } from './database/client';
import { startAPIServer } from './api';
import { sessionManager, commandRouter } from './middleware/session';
import { aiService } from './services';
import type { ExtendedClient, Command } from './types';

// Load environment variables
dotenvConfig();

// Validate required environment variables
const requiredEnvVars = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GITHUB_TOKEN',
  'GITHUB_ORG',
  'OPENAI_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    log.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
}) as ExtendedClient;

// ===========================================
// EVENT HANDLERS
// ===========================================

client.once(Events.ClientReady, async (c) => {
  log.info(`🚀 Ultra ACE is online as ${c.user.tag}`);
  
  // Set bot user ID for session manager
  sessionManager.setBotUserId(c.user.id);
  
  // Set activity status
  c.user.setActivity('!ace help | /ace', { type: ActivityType.Listening });

  // Check database connection
  const dbHealthy = await database.healthCheck();
  if (dbHealthy) {
    log.info('✅ Database connection healthy');
  } else {
    log.warn('⚠️ Database connection issues detected');
  }

  // Start API server if enabled
  if (process.env.API_PORT) {
    try {
      await startAPIServer(parseInt(process.env.API_PORT, 10));
      log.info(`✅ API server running on port ${process.env.API_PORT}`);
    } catch (err) {
      log.error('Failed to start API server', err);
    }
  }

  log.info('✅ Bot ready and listening for commands');
});

// ===========================================
// MESSAGE HANDLER (Prefix & Mention Activation)
// ===========================================

client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check activation
  const activation = sessionManager.checkActivation(message);

  if (!activation.activated) {
    // Message doesn't activate the bot - ignore it
    return;
  }

  // Rate limiting check
  const rateLimit = await sessionManager.checkRateLimit(message.author.id);
  if (!rateLimit.allowed) {
    await message.reply(`⏳ Rate limited. Please wait ${rateLimit.resetIn} seconds.`);
    return;
  }

  log.info('Message activation', {
    reason: activation.reason,
    userId: message.author.id,
    channelId: message.channelId,
  });

  try {
    switch (activation.reason) {
      case 'prefix':
        // Handle !ace commands
        await commandRouter.routePrefixCommand(activation.content || '', message);
        break;

      case 'mention':
        // Handle @UltraACE mentions - treat as AI chat
        if (activation.content && activation.content.length > 0) {
          await handleMentionChat(message, activation.content);
        } else {
          await message.reply('👋 Hi! Use `!ace help` or `/ace` to see what I can do.');
        }
        break;

      case 'session':
        // Active session - treat as AI chat
        await handleSessionChat(message, activation.content || '', activation.session!);
        break;
    }
  } catch (err) {
    log.error('Message handler error', err);
    await message.reply('❌ An error occurred. Please try again.').catch(() => {});
  }
});

/**
 * Handle mention-based chat
 */
async function handleMentionChat(message: Message, content: string): Promise<void> {
  await message.channel.sendTyping();

  const result = await aiService.chat(content, {
    channelId: message.channelId,
    userId: message.author.id,
    includeContext: true,
  });

  if (!result.success) {
    await message.reply(`❌ ${result.error}`);
    return;
  }

  const response = result.data!.content;

  // Handle long responses
  if (response.length > 2000) {
    const chunks = splitMessage(response);
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } else {
    await message.reply(response);
  }
}

/**
 * Handle session-based chat
 */
async function handleSessionChat(message: Message, content: string, session: any): Promise<void> {
  await message.channel.sendTyping();

  const result = await aiService.chat(content, {
    channelId: message.channelId,
    projectId: session.projectId,
    userId: message.author.id,
    includeContext: true,
  });

  if (!result.success) {
    await message.reply(`❌ ${result.error}`);
    return;
  }

  const response = result.data!.content;

  if (response.length > 2000) {
    const chunks = splitMessage(response);
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } else {
    await message.reply(response);
  }
}

/**
 * Split long messages for Discord's 2000 char limit
 */
function splitMessage(content: string, maxLength: number = 1990): string[] {
  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex).trim();
  }

  return chunks;
}

// ===========================================
// INTERACTION HANDLER (Slash Commands)
// ===========================================

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName) as Command | undefined;

    if (!command) {
      log.warn(`Unknown command: ${interaction.commandName}`);
      await interaction.reply({ content: 'Command not found', ephemeral: true });
      return;
    }

    const rateLimit = await sessionManager.checkRateLimit(interaction.user.id);
    if (!rateLimit.allowed) {
      await interaction.reply({
        content: `⏳ Rate limited. Please wait ${rateLimit.resetIn} seconds.`,
        ephemeral: true,
      });
      return;
    }

    try {
      log.command(
        interaction.commandName,
        interaction.user.id,
        interaction.guildId || 'DM',
        { subcommand: interaction.options.getSubcommand(false) }
      );

      await command.execute(interaction);
    } catch (error) {
      log.error(`Error executing command ${interaction.commandName}`, error);

      const errorMessage = 'There was an error executing this command.';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }

  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName) as Command | undefined;
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      log.error(`Autocomplete error for ${interaction.commandName}`, error);
    }
  }

  if (interaction.isButton()) {
    const [action, type, id] = interaction.customId.split('_');
    log.debug('Button interaction', { action, type, id });
  }
});

// ===========================================
// ERROR HANDLERS
// ===========================================

client.on(Events.Error, (error) => {
  log.error('Discord client error', error);
});

client.on(Events.Warn, (message) => {
  log.warn('Discord client warning', { message });
});

// ===========================================
// STARTUP
// ===========================================

async function main() {
  try {
    log.info('Starting Ultra ACE...');
    log.info('Activation methods: /ace commands, !ace prefix, @mention, sessions');

    loadCommands(client);

    await registerCommands(
      process.env.DISCORD_TOKEN!,
      process.env.DISCORD_CLIENT_ID!,
      process.env.DISCORD_GUILD_ID
    );

    await client.login(process.env.DISCORD_TOKEN);

  } catch (error) {
    log.error('Failed to start bot', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  log.info('Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.info('Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection', { reason, promise });
});

main();

export default client;
