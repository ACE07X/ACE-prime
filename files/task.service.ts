/**
 * Ultra ACE - Task Service
 * Handles all task-related database operations
 */

import { db } from '../database/client';
import { log } from '../utils/logger';
import type {
  Task,
  CreateTaskInput,
  TaskStatus,
  TaskPriority,
  TaskType,
  ServiceResult,
  PaginationOptions,
  FilterOptions,
} from '../types';

export class TaskService {
  /**
   * Create a new task
   */
  async create(input: CreateTaskInput): Promise<ServiceResult<Task>> {
    try {
      const taskData = {
        project_id: input.project_id,
        title: input.title,
        description: input.description || null,
        status: 'todo' as TaskStatus,
        priority: input.priority || 'medium' as TaskPriority,
        type: input.type || 'feature' as TaskType,
        assignee_id: input.assignee_id || null,
        reporter_id: input.reporter_id,
        parent_task_id: input.parent_task_id || null,
        due_date: input.due_date || null,
        estimated_hours: input.estimated_hours || null,
        labels: input.labels || [],
        metadata: input.metadata || {},
      };

      const { data, error } = await db
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        log.error('Failed to create task', error);
        return { success: false, error: error.message };
      }

      log.info('Task created', { taskId: data.id, title: input.title });
      return { success: true, data: data as Task };

    } catch (err) {
      log.error('Task creation error', err);
      return { success: false, error: 'Failed to create task' };
    }
  }

  /**
   * Get a task by ID
   */
  async getById(taskId: string): Promise<ServiceResult<Task>> {
    try {
      const { data, error } = await db
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error || !data) {
        return { success: false, error: 'Task not found' };
      }

      return { success: true, data: data as Task };

    } catch (err) {
      log.error('Get task error', err);
      return { success: false, error: 'Failed to fetch task' };
    }
  }

  /**
   * List tasks for a project with filtering
   */
  async listByProject(
    projectId: string,
    options: PaginationOptions & FilterOptions = {}
  ): Promise<ServiceResult<{ tasks: Task[]; total: number }>> {
    try {
      const {
        page = 1,
        limit = 25,
        sort_by = 'created_at',
        sort_order = 'desc',
        status,
        priority,
        assignee,
        labels,
        search,
      } = options;

      let query = db
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId);

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

      if (assignee) {
        query = query.eq('assignee_id', assignee);
      }

      if (labels && labels.length > 0) {
        query = query.overlaps('labels', labels);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          tasks: (data || []) as Task[],
          total: count || 0,
        },
      };

    } catch (err) {
      log.error('List tasks error', err);
      return { success: false, error: 'Failed to list tasks' };
    }
  }

  /**
   * Get tasks assigned to a user
   */
  async getAssignedTasks(
    userId: string,
    options: { includeCompleted?: boolean } = {}
  ): Promise<ServiceResult<Task[]>> {
    try {
      let query = db
        .from('tasks')
        .select('*')
        .eq('assignee_id', userId);

      if (!options.includeCompleted) {
        query = query.not('status', 'in', '("done","cancelled")');
      }

      const { data, error } = await query.order('priority', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as Task[] };

    } catch (err) {
      log.error('Get assigned tasks error', err);
      return { success: false, error: 'Failed to fetch assigned tasks' };
    }
  }

  /**
   * Update a task
   */
  async update(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'created_at' | 'project_id'>>
  ): Promise<ServiceResult<Task>> {
    try {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Set completed_at if status is done
      if (updates.status === 'done' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await db
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      log.info('Task updated', { taskId, updates: Object.keys(updates) });
      return { success: true, data: data as Task };

    } catch (err) {
      log.error('Update task error', err);
      return { success: false, error: 'Failed to update task' };
    }
  }

  /**
   * Assign a task to a user
   */
  async assign(taskId: string, userId: string): Promise<ServiceResult<Task>> {
    return this.update(taskId, { assignee_id: userId });
  }

  /**
   * Unassign a task
   */
  async unassign(taskId: string): Promise<ServiceResult<Task>> {
    return this.update(taskId, { assignee_id: null });
  }

  /**
   * Update task status
   */
  async updateStatus(taskId: string, status: TaskStatus): Promise<ServiceResult<Task>> {
    return this.update(taskId, { status });
  }

  /**
   * Add labels to a task
   */
  async addLabels(taskId: string, labels: string[]): Promise<ServiceResult<Task>> {
    try {
      const { data: task } = await db
        .from('tasks')
        .select('labels')
        .eq('id', taskId)
        .single();

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      const existingLabels = task.labels || [];
      const newLabels = [...new Set([...existingLabels, ...labels])];

      return this.update(taskId, { labels: newLabels });

    } catch (err) {
      log.error('Add labels error', err);
      return { success: false, error: 'Failed to add labels' };
    }
  }

  /**
   * Remove labels from a task
   */
  async removeLabels(taskId: string, labels: string[]): Promise<ServiceResult<Task>> {
    try {
      const { data: task } = await db
        .from('tasks')
        .select('labels')
        .eq('id', taskId)
        .single();

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      const newLabels = (task.labels || []).filter(l => !labels.includes(l));

      return this.update(taskId, { labels: newLabels });

    } catch (err) {
      log.error('Remove labels error', err);
      return { success: false, error: 'Failed to remove labels' };
    }
  }

  /**
   * Delete a task
   */
  async delete(taskId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await db
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        return { success: false, error: error.message };
      }

      log.info('Task deleted', { taskId });
      return { success: true };

    } catch (err) {
      log.error('Delete task error', err);
      return { success: false, error: 'Failed to delete task' };
    }
  }

  /**
   * Get task statistics for a project
   */
  async getProjectStats(projectId: string): Promise<ServiceResult<{
    total: number;
    by_status: Record<TaskStatus, number>;
    by_priority: Record<TaskPriority, number>;
    overdue: number;
    unassigned: number;
  }>> {
    try {
      const { data, error } = await db
        .from('tasks')
        .select('status, priority, assignee_id, due_date')
        .eq('project_id', projectId);

      if (error) {
        return { success: false, error: error.message };
      }

      const tasks = data || [];
      const now = new Date();

      const stats = {
        total: tasks.length,
        by_status: {} as Record<TaskStatus, number>,
        by_priority: {} as Record<TaskPriority, number>,
        overdue: 0,
        unassigned: 0,
      };

      for (const task of tasks) {
        // Count by status
        stats.by_status[task.status as TaskStatus] = 
          (stats.by_status[task.status as TaskStatus] || 0) + 1;

        // Count by priority
        stats.by_priority[task.priority as TaskPriority] = 
          (stats.by_priority[task.priority as TaskPriority] || 0) + 1;

        // Count overdue
        if (
          task.due_date && 
          new Date(task.due_date) < now && 
          !['done', 'cancelled'].includes(task.status)
        ) {
          stats.overdue++;
        }

        // Count unassigned
        if (!task.assignee_id && !['done', 'cancelled'].includes(task.status)) {
          stats.unassigned++;
        }
      }

      return { success: true, data: stats };

    } catch (err) {
      log.error('Get project stats error', err);
      return { success: false, error: 'Failed to get project statistics' };
    }
  }

  /**
   * Get subtasks for a parent task
   */
  async getSubtasks(parentTaskId: string): Promise<ServiceResult<Task[]>> {
    try {
      const { data, error } = await db
        .from('tasks')
        .select('*')
        .eq('parent_task_id', parentTaskId)
        .order('created_at', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as Task[] };

    } catch (err) {
      log.error('Get subtasks error', err);
      return { success: false, error: 'Failed to fetch subtasks' };
    }
  }

  /**
   * Bulk update task status
   */
  async bulkUpdateStatus(
    taskIds: string[],
    status: TaskStatus
  ): Promise<ServiceResult<number>> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'done') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error, count } = await db
        .from('tasks')
        .update(updateData)
        .in('id', taskIds);

      if (error) {
        return { success: false, error: error.message };
      }

      log.info('Bulk task update', { count, status });
      return { success: true, data: count || 0 };

    } catch (err) {
      log.error('Bulk update error', err);
      return { success: false, error: 'Failed to bulk update tasks' };
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();
export default taskService;
