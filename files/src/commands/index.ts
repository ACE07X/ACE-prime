/**
 * Ultra ACE - Command Loader
 * Loads and registers all Discord commands
 */

import { Collection, REST, Routes } from 'discord.js';
import { log } from '../utils/logger';
import type { Command, ExtendedClient } from '../types';

// Import commands
import projectCommand from './project';
import taskCommand from './task';
import githubCommand from './github';
import noteCommand from './note';
import aiCommand from './ai';

// All commands
export const commands: Command[] = [
  projectCommand,
  taskCommand,
  githubCommand,
  noteCommand,
  aiCommand,
];

/**
 * Load commands into the client
 */
export function loadCommands(client: ExtendedClient): void {
  client.commands = new Collection();

  for (const command of commands) {
    client.commands.set(command.data.name, command);
    log.info(`Loaded command: ${command.data.name}`);
  }
}

/**
 * Register commands with Discord
 */
export async function registerCommands(
  token: string,
  clientId: string,
  guildId?: string
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token);

  const commandData = commands.map(cmd => cmd.data.toJSON());

  try {
    if (guildId) {
      // Register for specific guild (faster, good for development)
      log.info(`Registering ${commandData.length} commands for guild ${guildId}`);
      
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandData }
      );

      log.info('Guild commands registered successfully');
    } else {
      // Register globally (takes up to 1 hour to propagate)
      log.info(`Registering ${commandData.length} global commands`);
      
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandData }
      );

      log.info('Global commands registered successfully');
    }
  } catch (error) {
    log.error('Failed to register commands', error);
    throw error;
  }
}

// Export individual commands for testing
export { projectCommand } from './project';
export { taskCommand } from './task';
export { githubCommand } from './github';
export { noteCommand } from './note';
export { aiCommand } from './ai';
