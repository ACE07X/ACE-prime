/**
 * Ultra ACE - Core Type Definitions
 * SoulTech Discord AI Project Manager Bot
 */

import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
  Collection,
  Client,
  GuildMember
} from 'discord.js';

// ===========================================
// DISCORD TYPES
// ===========================================

export interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: any) => Promise<void>;
}

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

// ===========================================
// PROJECT TYPES
// ===========================================

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  guild_id: string;
  channel_id: string | null;
  github_repo: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  metadata: ProjectMetadata;
}

export interface ProjectMetadata {
  tags?: string[];
  deadline?: string;
  budget?: number;
  team_size?: number;
  tech_stack?: string[];
  custom?: Record<string, unknown>;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  priority?: ProjectPriority;
  guild_id: string;
  channel_id?: string;
  github_repo?: string;
  owner_id: string;
  metadata?: ProjectMetadata;
}

// ===========================================
// TASK TYPES
// ===========================================

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'feature' | 'bug' | 'improvement' | 'documentation' | 'research' | 'other';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
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
  metadata: TaskMetadata;
}

export interface TaskMetadata {
  github_issue?: number;
  github_pr?: number;
  blocked_by?: string[];
  blocks?: string[];
  attachments?: string[];
  custom?: Record<string, unknown>;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  type?: TaskType;
  assignee_id?: string;
  reporter_id: string;
  parent_task_id?: string;
  due_date?: string;
  estimated_hours?: number;
  labels?: string[];
  metadata?: TaskMetadata;
}

// ===========================================
// NOTE TYPES
// ===========================================

export type NoteType = 'general' | 'decision' | 'meeting' | 'idea' | 'blocker' | 'reference';

export interface Note {
  id: string;
  project_id: string | null;
  task_id: string | null;
  channel_id: string;
  author_id: string;
  title: string;
  content: string;
  type: NoteType;
  pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  metadata: NoteMetadata;
}

export interface NoteMetadata {
  mentions?: string[];
  links?: string[];
  attachments?: string[];
  custom?: Record<string, unknown>;
}

export interface CreateNoteInput {
  project_id?: string;
  task_id?: string;
  channel_id: string;
  author_id: string;
  title: string;
  content: string;
  type?: NoteType;
  tags?: string[];
  metadata?: NoteMetadata;
}

// ===========================================
// FILE TYPES
// ===========================================

export interface StoredFile {
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
  metadata: FileMetadata;
}

export interface FileMetadata {
  original_name?: string;
  encoding?: string;
  checksum?: string;
  custom?: Record<string, unknown>;
}

// ===========================================
// GITHUB TYPES
// ===========================================

export interface GitHubRepo {
  name: string;
  full_name: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  labels: string[];
  created_at: string;
  url: string;
}

export interface GitOperationResult {
  success: boolean;
  message: string;
  data?: {
    commits?: GitHubCommit[];
    branch?: string;
    sha?: string;
    files_changed?: string[];
  };
  error?: string;
}

// ===========================================
// MEMORY / CONTEXT TYPES
// ===========================================

export interface ContextMessage {
  id: string;
  channel_id: string;
  project_id: string | null;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata: ContextMetadata;
}

export interface ContextMetadata {
  command?: string;
  tokens?: number;
  model?: string;
  custom?: Record<string, unknown>;
}

export interface ProjectContext {
  project: Project;
  recent_tasks: Task[];
  recent_notes: Note[];
  recent_commits?: GitHubCommit[];
  team_members: TeamMember[];
  conversation_history: ContextMessage[];
}

export interface ChannelContext {
  channel_id: string;
  guild_id: string;
  project?: Project;
  conversation_history: ContextMessage[];
}

// ===========================================
// USER / TEAM TYPES
// ===========================================

export interface TeamMember {
  id: string;
  user_id: string;
  guild_id: string;
  project_id: string;
  role: TeamRole;
  joined_at: string;
  permissions: TeamPermissions;
}

export type TeamRole = 'owner' | 'admin' | 'developer' | 'viewer';

export interface TeamPermissions {
  can_manage_project: boolean;
  can_manage_tasks: boolean;
  can_manage_members: boolean;
  can_push_code: boolean;
  can_delete: boolean;
}

export interface UserProfile {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string | null;
  github_username: string | null;
  timezone: string;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  notifications: boolean;
  dm_updates: boolean;
  daily_digest: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

// ===========================================
// API TYPES
// ===========================================

export interface APIUser {
  id: string;
  discord_id: string;
  username: string;
  guilds: string[];
  token?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

export interface APIMeta {
  page?: number;
  limit?: number;
  total?: number;
  has_more?: boolean;
}

export interface JWTPayload {
  sub: string;
  discord_id: string;
  username: string;
  guilds: string[];
  iat: number;
  exp: number;
}

// ===========================================
// SERVICE TYPES
// ===========================================

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterOptions {
  status?: string | string[];
  priority?: string | string[];
  assignee?: string;
  labels?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

// ===========================================
// EVENT TYPES
// ===========================================

export type BotEvent = 
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'task:created'
  | 'task:updated'
  | 'task:assigned'
  | 'task:completed'
  | 'note:created'
  | 'github:push'
  | 'github:pull'
  | 'github:commit';

export interface EventPayload {
  event: BotEvent;
  timestamp: string;
  actor_id: string;
  guild_id: string;
  channel_id?: string;
  data: Record<string, unknown>;
}

// ===========================================
// CONFIGURATION TYPES
// ===========================================

export interface BotConfig {
  discord: {
    token: string;
    clientId: string;
    guildId?: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  github: {
    token: string;
    org: string;
    defaultBranch: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  api: {
    port: number;
    secret: string;
    corsOrigin: string;
  };
  app: {
    nodeEnv: string;
    logLevel: string;
    timezone: string;
  };
  limits: {
    ratePoints: number;
    rateDuration: number;
    maxFileSize: number;
    allowedFileTypes: string[];
    maxContextMessages: number;
    contextTTLHours: number;
  };
}

// ===========================================
// UTILITY TYPES
// ===========================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
