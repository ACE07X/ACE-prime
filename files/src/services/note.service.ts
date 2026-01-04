/**
 * Ultra ACE - Note Service
 * Handles notes, decisions, and documentation storage
 */

import { db } from '../database/client';
import { log } from '../utils/logger';
import type {
  Note,
  CreateNoteInput,
  NoteType,
  ServiceResult,
  PaginationOptions,
} from '../types';

export class NoteService {
  /**
   * Create a new note
   */
  async create(input: CreateNoteInput): Promise<ServiceResult<Note>> {
    try {
      const noteData = {
        project_id: input.project_id || null,
        task_id: input.task_id || null,
        channel_id: input.channel_id,
        author_id: input.author_id,
        title: input.title,
        content: input.content,
        type: input.type || 'general' as NoteType,
        pinned: false,
        tags: input.tags || [],
        metadata: input.metadata || {},
      };

      const { data, error } = await db
        .from('notes')
        .insert(noteData)
        .select()
        .single();

      if (error) {
        log.error('Failed to create note', error);
        return { success: false, error: error.message };
      }

      log.info('Note created', { noteId: data.id, title: input.title });
      return { success: true, data: data as Note };

    } catch (err) {
      log.error('Note creation error', err);
      return { success: false, error: 'Failed to create note' };
    }
  }

  /**
   * Get a note by ID
   */
  async getById(noteId: string): Promise<ServiceResult<Note>> {
    try {
      const { data, error } = await db
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error || !data) {
        return { success: false, error: 'Note not found' };
      }

      return { success: true, data: data as Note };

    } catch (err) {
      log.error('Get note error', err);
      return { success: false, error: 'Failed to fetch note' };
    }
  }

  /**
   * List notes for a project
   */
  async listByProject(
    projectId: string,
    options: PaginationOptions & { type?: NoteType; pinned?: boolean } = {}
  ): Promise<ServiceResult<{ notes: Note[]; total: number }>> {
    try {
      const { page = 1, limit = 20, type, pinned } = options;

      let query = db
        .from('notes')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId);

      if (type) {
        query = query.eq('type', type);
      }

      if (pinned !== undefined) {
        query = query.eq('pinned', pinned);
      }

      const offset = (page - 1) * limit;
      query = query
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          notes: (data || []) as Note[],
          total: count || 0,
        },
      };

    } catch (err) {
      log.error('List notes error', err);
      return { success: false, error: 'Failed to list notes' };
    }
  }

  /**
   * List notes for a channel
   */
  async listByChannel(
    channelId: string,
    options: PaginationOptions = {}
  ): Promise<ServiceResult<{ notes: Note[]; total: number }>> {
    try {
      const { page = 1, limit = 20 } = options;

      const offset = (page - 1) * limit;
      const { data, error, count } = await db
        .from('notes')
        .select('*', { count: 'exact' })
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          notes: (data || []) as Note[],
          total: count || 0,
        },
      };

    } catch (err) {
      log.error('List channel notes error', err);
      return { success: false, error: 'Failed to list notes' };
    }
  }

  /**
   * Search notes
   */
  async search(
    guildId: string,
    query: string,
    options: { projectId?: string; type?: NoteType } = {}
  ): Promise<ServiceResult<Note[]>> {
    try {
      let dbQuery = db
        .from('notes')
        .select('*, projects!inner(guild_id)')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

      if (options.projectId) {
        dbQuery = dbQuery.eq('project_id', options.projectId);
      }

      if (options.type) {
        dbQuery = dbQuery.eq('type', options.type);
      }

      const { data, error } = await dbQuery
        .order('created_at', { ascending: false })
        .limit(25);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as Note[] };

    } catch (err) {
      log.error('Search notes error', err);
      return { success: false, error: 'Failed to search notes' };
    }
  }

  /**
   * Get notes by tag
   */
  async getByTag(
    projectId: string,
    tag: string
  ): Promise<ServiceResult<Note[]>> {
    try {
      const { data, error } = await db
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .contains('tags', [tag])
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as Note[] };

    } catch (err) {
      log.error('Get notes by tag error', err);
      return { success: false, error: 'Failed to fetch notes' };
    }
  }

  /**
   * Update a note
   */
  async update(
    noteId: string,
    updates: Partial<Omit<Note, 'id' | 'created_at' | 'author_id'>>
  ): Promise<ServiceResult<Note>> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await db
        .from('notes')
        .update(updateData)
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      log.info('Note updated', { noteId });
      return { success: true, data: data as Note };

    } catch (err) {
      log.error('Update note error', err);
      return { success: false, error: 'Failed to update note' };
    }
  }

  /**
   * Pin/unpin a note
   */
  async togglePin(noteId: string): Promise<ServiceResult<Note>> {
    try {
      const { data: note } = await db
        .from('notes')
        .select('pinned')
        .eq('id', noteId)
        .single();

      if (!note) {
        return { success: false, error: 'Note not found' };
      }

      return this.update(noteId, { pinned: !note.pinned });

    } catch (err) {
      log.error('Toggle pin error', err);
      return { success: false, error: 'Failed to toggle pin' };
    }
  }

  /**
   * Add tags to a note
   */
  async addTags(noteId: string, tags: string[]): Promise<ServiceResult<Note>> {
    try {
      const { data: note } = await db
        .from('notes')
        .select('tags')
        .eq('id', noteId)
        .single();

      if (!note) {
        return { success: false, error: 'Note not found' };
      }

      const existingTags = note.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])];

      return this.update(noteId, { tags: newTags });

    } catch (err) {
      log.error('Add tags error', err);
      return { success: false, error: 'Failed to add tags' };
    }
  }

  /**
   * Delete a note
   */
  async delete(noteId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await db
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        return { success: false, error: error.message };
      }

      log.info('Note deleted', { noteId });
      return { success: true };

    } catch (err) {
      log.error('Delete note error', err);
      return { success: false, error: 'Failed to delete note' };
    }
  }

  /**
   * Get all decisions for a project
   */
  async getDecisions(projectId: string): Promise<ServiceResult<Note[]>> {
    try {
      const { data, error } = await db
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .eq('type', 'decision')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as Note[] };

    } catch (err) {
      log.error('Get decisions error', err);
      return { success: false, error: 'Failed to fetch decisions' };
    }
  }

  /**
   * Get pinned notes for a project
   */
  async getPinned(projectId: string): Promise<ServiceResult<Note[]>> {
    try {
      const { data, error } = await db
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .eq('pinned', true)
        .order('updated_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as Note[] };

    } catch (err) {
      log.error('Get pinned notes error', err);
      return { success: false, error: 'Failed to fetch pinned notes' };
    }
  }

  /**
   * Link note to a task
   */
  async linkToTask(noteId: string, taskId: string): Promise<ServiceResult<Note>> {
    return this.update(noteId, { task_id: taskId });
  }

  /**
   * Get all unique tags used in a project
   */
  async getProjectTags(projectId: string): Promise<ServiceResult<string[]>> {
    try {
      const { data, error } = await db
        .from('notes')
        .select('tags')
        .eq('project_id', projectId);

      if (error) {
        return { success: false, error: error.message };
      }

      const allTags = (data || []).flatMap(n => n.tags || []);
      const uniqueTags = [...new Set(allTags)].sort();

      return { success: true, data: uniqueTags as string[] };

    } catch (err) {
      log.error('Get project tags error', err);
      return { success: false, error: 'Failed to fetch tags' };
    }
  }
}

// Export singleton instance
export const noteService = new NoteService();
export default noteService;
