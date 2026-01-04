/**
 * Ultra ACE - Supabase Database Client
 * Database connection and query utilities
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { log } from '../utils/logger';

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          status: string;
          priority: string;
          guild_id: string;
          channel_id: string | null;
          github_repo: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          type: string;
          assignee_id: string | null;
          reporter_id: string;
          parent_task_id: string | null;
          due_date: string | null;
          estimated_hours: number | null;
          actual_hours: number | null;
          labels: string[];
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      notes: {
        Row: {
          id: string;
          project_id: string | null;
          task_id: string | null;
          channel_id: string;
          author_id: string;
          title: string;
          content: string;
          type: string;
          pinned: boolean;
          tags: string[];
          created_at: string;
          updated_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: Omit<Database['public']['Tables']['notes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
      };
      files: {
        Row: {
          id: string;
          project_id: string | null;
          task_id: string | null;
          name: string;
          path: string;
          mime_type: string;
          size_bytes: number;
          uploader_id: string;
          storage_key: string;
          created_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: Omit<Database['public']['Tables']['files']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['files']['Insert']>;
      };
      context_messages: {
        Row: {
          id: string;
          channel_id: string;
          project_id: string | null;
          user_id: string;
          role: string;
          content: string;
          created_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: Omit<Database['public']['Tables']['context_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['context_messages']['Insert']>;
      };
      team_members: {
        Row: {
          id: string;
          user_id: string;
          guild_id: string;
          project_id: string;
          role: string;
          joined_at: string;
          permissions: Record<string, boolean>;
        };
        Insert: Omit<Database['public']['Tables']['team_members']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>;
      };
      user_profiles: {
        Row: {
          id: string;
          discord_id: string;
          username: string;
          avatar_url: string | null;
          github_username: string | null;
          timezone: string;
          preferences: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
    };
  };
}

class DatabaseClient {
  private client: SupabaseClient<Database>;
  private serviceClient: SupabaseClient<Database>;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Regular client for user-level operations
    this.client = createClient<Database>(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });

    // Service client for admin operations
    this.serviceClient = createClient<Database>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    log.info('Supabase client initialized');
  }

  /**
   * Get the regular Supabase client
   */
  get db() {
    return this.client;
  }

  /**
   * Get the service role client (admin access)
   */
  get admin() {
    return this.serviceClient;
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('projects').select('id').limit(1);
      return !error;
    } catch (err) {
      log.error('Database health check failed', err);
      return false;
    }
  }

  /**
   * Execute a transaction-like operation
   */
  async transaction<T>(
    operations: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    // Note: Supabase doesn't support true transactions in the client
    // This wrapper provides a consistent interface for future migration
    return operations(this.serviceClient);
  }
}

// Export singleton instance
export const database = new DatabaseClient();
export const db = database.db as any;
export const adminDb = database.admin as any;

export default database;
