/**
 * Ultra ACE - Memory Service
 * Persistent AI context and conversation history management
 */

import { db } from '../database/client';
import { log } from '../utils/logger';
import NodeCache from 'node-cache';
import type {
  ContextMessage,
  ProjectContext,
  ChannelContext,
  Project,
  Task,
  Note,
  ServiceResult,
} from '../types';

interface MemoryConfig {
  maxMessages: number;
  ttlHours: number;
  cacheEnabled: boolean;
}

export class MemoryService {
  private cache: NodeCache;
  private maxMessages: number;
  private ttlHours: number;

  constructor(config?: Partial<MemoryConfig>) {
    this.maxMessages = config?.maxMessages || 50;
    this.ttlHours = config?.ttlHours || 168; // 1 week default
    
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour cache
      checkperiod: 600, // Check every 10 minutes
      useClones: false,
    });
  }

  // ===========================================
  // MESSAGE STORAGE
  // ===========================================

  /**
   * Store a context message
   */
  async saveMessage(
    channelId: string,
    userId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    options: {
      projectId?: string;
      command?: string;
      tokens?: number;
    } = {}
  ): Promise<ServiceResult<ContextMessage>> {
    try {
      const messageData = {
        channel_id: channelId,
        project_id: options.projectId || null,
        user_id: userId,
        role,
        content,
        metadata: {
          command: options.command,
          tokens: options.tokens,
        },
      };

      const { data, error } = await db
        .from('context_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        log.error('Failed to save message', error);
        return { success: false, error: error.message };
      }

      // Invalidate cache for this channel
      this.cache.del(`channel:${channelId}`);
      if (options.projectId) {
        this.cache.del(`project:${options.projectId}`);
      }

      // Cleanup old messages
      await this.pruneOldMessages(channelId);

      return { success: true, data: data as ContextMessage };

    } catch (err) {
      log.error('Save message error', err);
      return { success: false, error: 'Failed to save message' };
    }
  }

  /**
   * Get conversation history for a channel
   */
  async getChannelHistory(
    channelId: string,
    limit?: number
  ): Promise<ServiceResult<ContextMessage[]>> {
    try {
      // Check cache first
      const cacheKey = `channel:${channelId}`;
      const cached = this.cache.get<ContextMessage[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached.slice(0, limit || this.maxMessages) };
      }

      const { data, error } = await db
        .from('context_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(limit || this.maxMessages);

      if (error) {
        return { success: false, error: error.message };
      }

      const messages = (data || []).reverse() as ContextMessage[];
      
      // Cache the result
      this.cache.set(cacheKey, messages);

      return { success: true, data: messages };

    } catch (err) {
      log.error('Get channel history error', err);
      return { success: false, error: 'Failed to fetch history' };
    }
  }

  /**
   * Get conversation history for a project
   */
  async getProjectHistory(
    projectId: string,
    limit?: number
  ): Promise<ServiceResult<ContextMessage[]>> {
    try {
      const cacheKey = `project:${projectId}`;
      const cached = this.cache.get<ContextMessage[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached.slice(0, limit || this.maxMessages) };
      }

      const { data, error } = await db
        .from('context_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit || this.maxMessages);

      if (error) {
        return { success: false, error: error.message };
      }

      const messages = (data || []).reverse() as ContextMessage[];
      this.cache.set(cacheKey, messages);

      return { success: true, data: messages };

    } catch (err) {
      log.error('Get project history error', err);
      return { success: false, error: 'Failed to fetch history' };
    }
  }

  // ===========================================
  // CONTEXT BUILDING
  // ===========================================

  /**
   * Build comprehensive project context for AI
   */
  async buildProjectContext(
    projectId: string,
    options: {
      includeHistory?: boolean;
      includeTasks?: boolean;
      includeNotes?: boolean;
      historyLimit?: number;
    } = {}
  ): Promise<ServiceResult<ProjectContext>> {
    try {
      const {
        includeHistory = true,
        includeTasks = true,
        includeNotes = true,
        historyLimit = 20,
      } = options;

      // Fetch project
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return { success: false, error: 'Project not found' };
      }

      // Build context object
      const context: ProjectContext = {
        project: project as Project,
        recent_tasks: [],
        recent_notes: [],
        team_members: [],
        conversation_history: [],
      };

      // Fetch recent tasks
      if (includeTasks) {
        const { data: tasks } = await db
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .not('status', 'in', '("done","cancelled")')
          .order('updated_at', { ascending: false })
          .limit(10);

        context.recent_tasks = (tasks || []) as Task[];
      }

      // Fetch recent notes
      if (includeNotes) {
        const { data: notes } = await db
          .from('notes')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5);

        context.recent_notes = (notes || []) as Note[];
      }

      // Fetch conversation history
      if (includeHistory) {
        const historyResult = await this.getProjectHistory(projectId, historyLimit);
        if (historyResult.success && historyResult.data) {
          context.conversation_history = historyResult.data;
        }
      }

      // Fetch team members
      const { data: members } = await db
        .from('team_members')
        .select('*')
        .eq('project_id', projectId);

      context.team_members = (members || []) as any[];

      return { success: true, data: context };

    } catch (err) {
      log.error('Build project context error', err);
      return { success: false, error: 'Failed to build context' };
    }
  }

  /**
   * Build channel context (may or may not be linked to a project)
   */
  async buildChannelContext(
    channelId: string,
    guildId: string,
    options: { historyLimit?: number } = {}
  ): Promise<ServiceResult<ChannelContext>> {
    try {
      const { historyLimit = 20 } = options;

      const context: ChannelContext = {
        channel_id: channelId,
        guild_id: guildId,
        conversation_history: [],
      };

      // Check if channel is linked to a project
      const { data: project } = await db
        .from('projects')
        .select('*')
        .eq('channel_id', channelId)
        .single();

      if (project) {
        context.project = project as Project;
      }

      // Fetch conversation history
      const historyResult = await this.getChannelHistory(channelId, historyLimit);
      if (historyResult.success && historyResult.data) {
        context.conversation_history = historyResult.data;
      }

      return { success: true, data: context };

    } catch (err) {
      log.error('Build channel context error', err);
      return { success: false, error: 'Failed to build context' };
    }
  }

  // ===========================================
  // CONTEXT FORMATTING
  // ===========================================

  /**
   * Format context for AI prompt
   */
  formatContextForAI(context: ProjectContext | ChannelContext): string {
    const parts: string[] = [];

    // Project info
    if ('project' in context && context.project) {
      parts.push(`## Current Project: ${context.project.name}`);
      parts.push(`Status: ${context.project.status} | Priority: ${context.project.priority}`);
      if (context.project.description) {
        parts.push(`Description: ${context.project.description}`);
      }
      if (context.project.github_repo) {
        parts.push(`GitHub: ${context.project.github_repo}`);
      }
      parts.push('');
    }

    // Recent tasks
    if ('recent_tasks' in context && context.recent_tasks.length > 0) {
      parts.push('## Active Tasks:');
      for (const task of context.recent_tasks.slice(0, 5)) {
        const assignee = task.assignee_id ? `@${task.assignee_id}` : 'unassigned';
        parts.push(`- [${task.status}] ${task.title} (${task.priority}, ${assignee})`);
      }
      parts.push('');
    }

    // Recent notes/decisions
    if ('recent_notes' in context && context.recent_notes.length > 0) {
      parts.push('## Recent Notes:');
      for (const note of context.recent_notes.slice(0, 3)) {
        parts.push(`- ${note.title} (${note.type})`);
      }
      parts.push('');
    }

    // Conversation history
    if (context.conversation_history.length > 0) {
      parts.push('## Recent Conversation:');
      for (const msg of context.conversation_history.slice(-10)) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const content = msg.content.length > 200 
          ? msg.content.substring(0, 200) + '...' 
          : msg.content;
        parts.push(`${role}: ${content}`);
      }
    }

    return parts.join('\n');
  }

  // ===========================================
  // MEMORY MANAGEMENT
  // ===========================================

  /**
   * Clear old messages from a channel
   */
  private async pruneOldMessages(channelId: string): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - this.ttlHours);

      // Keep at least maxMessages, but remove older than TTL
      const { data: recentMessages } = await db
        .from('context_messages')
        .select('id')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(this.maxMessages);

      if (!recentMessages || recentMessages.length === 0) return;

      const keepIds = recentMessages.map(m => m.id);

      await db
        .from('context_messages')
        .delete()
        .eq('channel_id', channelId)
        .lt('created_at', cutoffDate.toISOString())
        .not('id', 'in', `(${keepIds.join(',')})`);

    } catch (err) {
      log.error('Prune messages error', err);
    }
  }

  /**
   * Clear all context for a channel
   */
  async clearChannelContext(channelId: string): Promise<ServiceResult<void>> {
    try {
      await db
        .from('context_messages')
        .delete()
        .eq('channel_id', channelId);

      this.cache.del(`channel:${channelId}`);

      log.info('Channel context cleared', { channelId });
      return { success: true };

    } catch (err) {
      log.error('Clear context error', err);
      return { success: false, error: 'Failed to clear context' };
    }
  }

  /**
   * Clear all context for a project
   */
  async clearProjectContext(projectId: string): Promise<ServiceResult<void>> {
    try {
      await db
        .from('context_messages')
        .delete()
        .eq('project_id', projectId);

      this.cache.del(`project:${projectId}`);

      log.info('Project context cleared', { projectId });
      return { success: true };

    } catch (err) {
      log.error('Clear project context error', err);
      return { success: false, error: 'Failed to clear context' };
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(guildId: string): Promise<ServiceResult<{
    total_messages: number;
    channels_with_context: number;
    projects_with_context: number;
    oldest_message: string | null;
  }>> {
    try {
      // This is a simplified stats query
      const { count: totalMessages } = await db
        .from('context_messages')
        .select('*', { count: 'exact', head: true });

      const { data: channels } = await db
        .from('context_messages')
        .select('channel_id')
        .limit(1000);

      const { data: projects } = await db
        .from('context_messages')
        .select('project_id')
        .not('project_id', 'is', null)
        .limit(1000);

      const { data: oldest } = await db
        .from('context_messages')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      return {
        success: true,
        data: {
          total_messages: totalMessages || 0,
          channels_with_context: new Set(channels?.map(c => c.channel_id) || []).size,
          projects_with_context: new Set(projects?.map(p => p.project_id) || []).size,
          oldest_message: oldest?.created_at || null,
        },
      };

    } catch (err) {
      log.error('Get memory stats error', err);
      return { success: false, error: 'Failed to get statistics' };
    }
  }

  /**
   * Search through context messages
   */
  async searchContext(
    query: string,
    options: { channelId?: string; projectId?: string; limit?: number } = {}
  ): Promise<ServiceResult<ContextMessage[]>> {
    try {
      let dbQuery = db
        .from('context_messages')
        .select('*')
        .ilike('content', `%${query}%`);

      if (options.channelId) {
        dbQuery = dbQuery.eq('channel_id', options.channelId);
      }

      if (options.projectId) {
        dbQuery = dbQuery.eq('project_id', options.projectId);
      }

      const { data, error } = await dbQuery
        .order('created_at', { ascending: false })
        .limit(options.limit || 20);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as ContextMessage[] };

    } catch (err) {
      log.error('Search context error', err);
      return { success: false, error: 'Failed to search context' };
    }
  }
}

// Export singleton instance
export const memoryService = new MemoryService({
  maxMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES || '50', 10),
  ttlHours: parseInt(process.env.CONTEXT_TTL_HOURS || '168', 10),
});

export default memoryService;
