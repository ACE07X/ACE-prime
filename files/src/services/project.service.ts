/**
 * Ultra ACE - Project Service
 * Handles all project-related database operations
 */

import { v4 as uuidv4 } from 'uuid';
import { db, adminDb } from '../database/client';
import { log } from '../utils/logger';
import type {
  Project,
  CreateProjectInput,
  ProjectStatus,
  ProjectPriority,
  ServiceResult,
  PaginationOptions,
  FilterOptions,
  TeamMember,
  TeamRole,
  TeamPermissions
} from '../types';

/**
 * Generate a URL-safe slug from project name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Get default permissions for a role
 */
function getDefaultPermissions(role: TeamRole): TeamPermissions {
  switch (role) {
    case 'owner':
      return {
        can_manage_project: true,
        can_manage_tasks: true,
        can_manage_members: true,
        can_push_code: true,
        can_delete: true,
      };
    case 'admin':
      return {
        can_manage_project: true,
        can_manage_tasks: true,
        can_manage_members: true,
        can_push_code: true,
        can_delete: false,
      };
    case 'developer':
      return {
        can_manage_project: false,
        can_manage_tasks: true,
        can_manage_members: false,
        can_push_code: true,
        can_delete: false,
      };
    case 'viewer':
    default:
      return {
        can_manage_project: false,
        can_manage_tasks: false,
        can_manage_members: false,
        can_push_code: false,
        can_delete: false,
      };
  }
}

export class ProjectService {
  /**
   * Create a new project
   */
  async create(input: CreateProjectInput): Promise<ServiceResult<Project>> {
    try {
      const slug = generateSlug(input.name);

      // Check for existing project with same slug in guild
      const { data: existing } = await db
        .from('projects')
        .select('id')
        .eq('guild_id', input.guild_id)
        .eq('slug', slug)
        .single();

      if (existing) {
        return {
          success: false,
          error: `A project with the name "${input.name}" already exists in this server`,
        };
      }

      const projectData = {
        name: input.name,
        slug,
        description: input.description || null,
        status: 'planning' as ProjectStatus,
        priority: input.priority || 'medium' as ProjectPriority,
        guild_id: input.guild_id,
        channel_id: input.channel_id || null,
        github_repo: input.github_repo || null,
        owner_id: input.owner_id,
        metadata: input.metadata || {},
      };

      const { data, error } = await db
        .from('projects')
        .insert(projectData as any)
        .select()
        .single();

      if (error) {
        log.error('Failed to create project', error);
        return { success: false, error: error.message };
      }

      // Add owner as team member
      await this.addTeamMember(data.id, input.owner_id, input.guild_id, 'owner');

      log.info('Project created', { projectId: data.id, name: input.name });
      return { success: true, data: data as Project };

    } catch (err) {
      log.error('Project creation error', err);
      return { success: false, error: 'Failed to create project' };
    }
  }

  /**
   * Get a project by ID
   */
  async getById(projectId: string): Promise<ServiceResult<Project>> {
    try {
      const { data, error } = await db
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        return { success: false, error: 'Project not found' };
      }

      return { success: true, data: data as Project };

    } catch (err) {
      log.error('Get project error', err);
      return { success: false, error: 'Failed to fetch project' };
    }
  }

  /**
   * Get a project by name/slug in a guild
   */
  async getByName(name: string, guildId: string): Promise<ServiceResult<Project>> {
    try {
      const slug = generateSlug(name);

      const { data, error } = await db
        .from('projects')
        .select('*')
        .eq('guild_id', guildId)
        .or(`slug.eq.${slug},name.ilike.${name}`)
        .single();

      if (error || !data) {
        return { success: false, error: `Project "${name}" not found` };
      }

      return { success: true, data: data as Project };

    } catch (err) {
      log.error('Get project by name error', err);
      return { success: false, error: 'Failed to fetch project' };
    }
  }

  /**
   * Get project by channel ID
   */
  async getByChannelId(channelId: string): Promise<ServiceResult<Project | null>> {
    try {
      const { data, error } = await db
        .from('projects')
        .select('*')
        .eq('channel_id', channelId)
        .single();

      if (error) {
        // No project linked to this channel is not an error
        return { success: true, data: null };
      }

      return { success: true, data: data as Project };

    } catch (err) {
      log.error('Get project by channel error', err);
      return { success: false, error: 'Failed to fetch project' };
    }
  }

  /**
   * List projects in a guild with filtering and pagination
   */
  async list(
    guildId: string,
    options: PaginationOptions & FilterOptions = {}
  ): Promise<ServiceResult<{ projects: Project[]; total: number }>> {
    try {
      const {
        page = 1,
        limit = 10,
        sort_by = 'created_at',
        sort_order = 'desc',
        status,
        priority,
        search,
      } = options;

      let query = db
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('guild_id', guildId);

      // Apply filters
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      if (priority) {
        if (Array.isArray(priority)) {
          query = query.in('priority', priority);
        } else {
          query = query.eq('priority', priority);
        }
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Apply pagination and sorting
      const offset = (page - 1) * limit;
      query = query
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        log.error('List projects error', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          projects: (data || []) as Project[],
          total: count || 0,
        },
      };

    } catch (err) {
      log.error('List projects error', err);
      return { success: false, error: 'Failed to list projects' };
    }
  }

  /**
   * Update a project
   */
  async update(
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'created_at' | 'guild_id'>>
  ): Promise<ServiceResult<Project>> {
    try {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Generate new slug if name changed
      if (updates.name) {
        updateData.slug = generateSlug(updates.name);
      }

      const { data, error } = await db
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        log.error('Update project error', error);
        return { success: false, error: error.message };
      }

      log.info('Project updated', { projectId, updates: Object.keys(updates) });
      return { success: true, data: data as Project };

    } catch (err) {
      log.error('Update project error', err);
      return { success: false, error: 'Failed to update project' };
    }
  }

  /**
   * Update project status
   */
  async updateStatus(
    projectId: string,
    status: ProjectStatus
  ): Promise<ServiceResult<Project>> {
    return this.update(projectId, { status });
  }

  /**
   * Link a GitHub repository to a project
   */
  async linkGitHub(
    projectId: string,
    repoName: string
  ): Promise<ServiceResult<Project>> {
    return this.update(projectId, { github_repo: repoName });
  }

  /**
   * Link a Discord channel to a project
   */
  async linkChannel(
    projectId: string,
    channelId: string
  ): Promise<ServiceResult<Project>> {
    return this.update(projectId, { channel_id: channelId });
  }

  /**
   * Delete a project (soft delete by archiving)
   */
  async delete(projectId: string, hard: boolean = false): Promise<ServiceResult<void>> {
    try {
      if (hard) {
        // Hard delete - remove from database
        const { error } = await adminDb
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        // Soft delete - archive the project
        const { error } = await db
          .from('projects')
          .update({ status: 'archived' as ProjectStatus })
          .eq('id', projectId);

        if (error) {
          return { success: false, error: error.message };
        }
      }

      log.info('Project deleted', { projectId, hard });
      return { success: true };

    } catch (err) {
      log.error('Delete project error', err);
      return { success: false, error: 'Failed to delete project' };
    }
  }

  /**
   * Add a team member to a project
   */
  async addTeamMember(
    projectId: string,
    userId: string,
    guildId: string,
    role: TeamRole = 'developer'
  ): Promise<ServiceResult<TeamMember>> {
    try {
      const memberData = {
        user_id: userId,
        guild_id: guildId,
        project_id: projectId,
        role,
        permissions: getDefaultPermissions(role),
      };

      const { data, error } = await db
        .from('team_members')
        .upsert(memberData, { onConflict: 'user_id,project_id' })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      log.info('Team member added', { projectId, userId, role });
      return { success: true, data: data as TeamMember };

    } catch (err) {
      log.error('Add team member error', err);
      return { success: false, error: 'Failed to add team member' };
    }
  }

  /**
   * Remove a team member from a project
   */
  async removeTeamMember(
    projectId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    try {
      const { error } = await db
        .from('team_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      log.info('Team member removed', { projectId, userId });
      return { success: true };

    } catch (err) {
      log.error('Remove team member error', err);
      return { success: false, error: 'Failed to remove team member' };
    }
  }

  /**
   * Get team members for a project
   */
  async getTeamMembers(projectId: string): Promise<ServiceResult<TeamMember[]>> {
    try {
      const { data, error } = await db
        .from('team_members')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as TeamMember[] };

    } catch (err) {
      log.error('Get team members error', err);
      return { success: false, error: 'Failed to fetch team members' };
    }
  }

  /**
   * Check if a user has permission for an action
   */
  async checkPermission(
    projectId: string,
    userId: string,
    permission: keyof TeamPermissions
  ): Promise<boolean> {
    try {
      const { data } = await db
        .from('team_members')
        .select('permissions')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (!data) return false;
      return data.permissions[permission] === true;

    } catch {
      return false;
    }
  }

  /**
   * Get projects for a user across all guilds
   */
  async getUserProjects(userId: string): Promise<ServiceResult<Project[]>> {
    try {
      const { data: memberships } = await db
        .from('team_members')
        .select('project_id')
        .eq('user_id', userId);

      if (!memberships || memberships.length === 0) {
        return { success: true, data: [] };
      }

      const projectIds = memberships.map(m => m.project_id);

      const { data, error } = await db
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .neq('status', 'archived');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as Project[] };

    } catch (err) {
      log.error('Get user projects error', err);
      return { success: false, error: 'Failed to fetch user projects' };
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();
export default projectService;
