-- Ultra ACE Database Schema
-- Run this migration in Supabase SQL Editor

-- ===========================================
-- EXTENSIONS
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- PROJECTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'planning' 
    CHECK (status IN ('planning', 'active', 'paused', 'completed', 'archived')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  guild_id VARCHAR(50) NOT NULL,
  channel_id VARCHAR(50),
  github_repo VARCHAR(200),
  owner_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  
  UNIQUE(guild_id, slug)
);

-- Indexes for projects
CREATE INDEX idx_projects_guild_id ON projects(guild_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_channel_id ON projects(channel_id);

-- ===========================================
-- TASKS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  type VARCHAR(20) NOT NULL DEFAULT 'feature'
    CHECK (type IN ('feature', 'bug', 'improvement', 'documentation', 'research', 'other')),
  assignee_id VARCHAR(50),
  reporter_id VARCHAR(50) NOT NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2),
  labels TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for tasks
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_reporter_id ON tasks(reporter_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_labels ON tasks USING GIN(labels);

-- ===========================================
-- NOTES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  channel_id VARCHAR(50) NOT NULL,
  author_id VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'general'
    CHECK (type IN ('general', 'decision', 'meeting', 'idea', 'blocker', 'reference')),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for notes
CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_task_id ON notes(task_id);
CREATE INDEX idx_notes_channel_id ON notes(channel_id);
CREATE INDEX idx_notes_author_id ON notes(author_id);
CREATE INDEX idx_notes_type ON notes(type);
CREATE INDEX idx_notes_pinned ON notes(pinned);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_notes_content_search ON notes USING GIN(to_tsvector('english', content));

-- ===========================================
-- FILES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploader_id VARCHAR(50) NOT NULL,
  storage_key VARCHAR(500) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for files
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_task_id ON files(task_id);
CREATE INDEX idx_files_uploader_id ON files(uploader_id);

-- ===========================================
-- CONTEXT MESSAGES TABLE (AI Memory)
-- ===========================================
CREATE TABLE IF NOT EXISTS context_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id VARCHAR(50) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for context messages
CREATE INDEX idx_context_channel_id ON context_messages(channel_id);
CREATE INDEX idx_context_project_id ON context_messages(project_id);
CREATE INDEX idx_context_user_id ON context_messages(user_id);
CREATE INDEX idx_context_created_at ON context_messages(created_at DESC);

-- ===========================================
-- TEAM MEMBERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(50) NOT NULL,
  guild_id VARCHAR(50) NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'developer'
    CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  permissions JSONB NOT NULL DEFAULT '{}',
  
  UNIQUE(user_id, project_id)
);

-- Indexes for team members
CREATE INDEX idx_team_user_id ON team_members(user_id);
CREATE INDEX idx_team_project_id ON team_members(project_id);
CREATE INDEX idx_team_guild_id ON team_members(guild_id);

-- ===========================================
-- USER PROFILES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id VARCHAR(50) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  github_username VARCHAR(100),
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user profiles
CREATE INDEX idx_user_discord_id ON user_profiles(discord_id);

-- ===========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Service role policies (allow all for service role)
CREATE POLICY "Service role has full access to projects"
  ON projects FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to tasks"
  ON tasks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to notes"
  ON notes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to files"
  ON files FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to context_messages"
  ON context_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to team_members"
  ON team_members FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to user_profiles"
  ON user_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ===========================================
-- SAMPLE DATA (Optional - for testing)
-- ===========================================
-- Uncomment to insert sample data

-- INSERT INTO projects (name, slug, description, status, priority, guild_id, owner_id)
-- VALUES ('Sample Project', 'sample-project', 'A sample project for testing', 'active', 'medium', '123456789', '987654321');
