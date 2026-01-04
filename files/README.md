# 🤖 Ultra ACE

**Advanced Discord AI Project Manager Bot for SoulTech**

Ultra ACE is a production-ready Discord bot that combines project management, task tracking, GitHub integration, and AI assistance into a single powerful platform for software development teams.

## ✨ Features

### 📁 Project Management
- Create, update, and archive projects
- Link projects to Discord channels
- Track project status and priority
- Team member management with role-based permissions

### ✅ Task Management
- Full task lifecycle (backlog → done)
- Assign tasks to team members
- Priority levels and labels
- Kanban board overview
- Due dates and time tracking

### 📝 Notes & Decisions
- Save meeting notes and decisions
- Pin important information
- Search across all notes
- Tag-based organization

### 🐙 GitHub Integration
- Pull/clone repositories
- Commit and push changes (with confirmation)
- Create branches
- View commits, PRs, and issues
- **Secure**: No force-push without explicit confirmation

### 🤖 AI Assistant
- Code debugging and review
- Architecture recommendations
- Code generation
- Commit message generation
- Context-aware conversations

### 🧠 Persistent Memory
- Per-channel conversation history
- Project-aware context
- Long-term memory across sessions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Discord Bot Token
- Supabase Account
- GitHub Personal Access Token
- OpenAI API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/soultech/ultra-ace.git
cd ultra-ace

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
# Execute scripts/migrate.sql in Supabase SQL Editor

# Build the project
npm run build

# Start the bot
npm start
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Lint code
npm run lint

# Run tests
npm test
```

## 🎮 Activation Rules

Ultra ACE only responds when explicitly activated:

| Method | Example |
|--------|---------|
| Slash Commands | `/project create MyApp` |
| Prefix Commands | `!ace help` |
| Mention | `@UltraACE how do I fix this bug?` |
| Session Mode | `!ace session start` (responds to all messages) |

## 📋 Commands

### Project Commands (`/project`)
```
/project create <name> [description] [priority] [github]
/project list [status]
/project view <name>
/project status <name> <status>
/project link <name>          # Link to current channel
/project github <name> <repo> # Link GitHub repo
/project delete <name> [permanent]
```

### Task Commands (`/task`)
```
/task create <title> <project> [description] [priority] [type] [assignee]
/task assign <task> <user>
/task status <task> <status>
/task list <project> [status] [assignee]
/task my                      # Show your assigned tasks
/task board <project>         # Kanban board view
```

### GitHub Commands (`/github`)
```
/github pull <repo> [branch]
/github push <repo> <message> [branch]
/github status <repo>
/github commits <repo> [count]
/github branch <repo> <name> [from]
/github prs <repo> [state]
/github issues <repo> [state]
/github repos
```

### Note Commands (`/note`)
```
/note save <title> <content> [type] [project] [tags]
/note list [project] [type]
/note search <query> [project]
/note view <id>
/note pin <id>
/note decisions <project>
/note delete <id>
```

### AI Commands (`/ai`)
```
/ai ask <question>
/ai debug <code> <error> [language]
/ai review <code> [language]
/ai generate <description> [language] [style]
/ai explain <code> [level]
/ai architecture <description>
/ai commit <changes> [style]
/ai context <view|clear>
```

### Prefix Commands (`!ace`)
```
!ace help
!ace session start|end|status
!ace ping
!ace <any message>  # Quick AI chat
```

## 🏗️ Architecture

```
ultra-ace/
├── src/
│   ├── commands/          # Discord slash commands
│   │   ├── project/       # Project management
│   │   ├── task/          # Task management
│   │   ├── github/        # GitHub integration
│   │   ├── note/          # Notes & decisions
│   │   └── ai/            # AI assistance
│   ├── services/          # Business logic
│   │   ├── project.service.ts
│   │   ├── task.service.ts
│   │   ├── note.service.ts
│   │   ├── github.service.ts
│   │   ├── memory.service.ts
│   │   └── ai.service.ts
│   ├── database/          # Supabase client
│   ├── middleware/        # Session & rate limiting
│   ├── api/               # REST API for dashboard
│   ├── utils/             # Logger, helpers
│   ├── types/             # TypeScript definitions
│   └── index.ts           # Entry point
├── config/                # Configuration loader
├── scripts/               # Database migrations
└── docs/                  # Documentation
```

## 🔒 Security

- **GitHub Safety**: Force-push requires explicit confirmation
- **Rate Limiting**: Per-user rate limits prevent abuse
- **Session Timeout**: Sessions expire after 30 minutes of inactivity
- **JWT Authentication**: Secure API access
- **Environment Variables**: Sensitive data never in code
- **RLS**: Row-level security in Supabase

## 🌐 REST API

The bot includes a REST API for web dashboard integration:

```
GET    /health                      # Health check
POST   /api/auth/token              # Get JWT token

GET    /api/projects                # List projects
GET    /api/projects/:id            # Get project
POST   /api/projects                # Create project
PATCH  /api/projects/:id            # Update project
DELETE /api/projects/:id            # Delete project

GET    /api/projects/:id/tasks      # List tasks
POST   /api/tasks                   # Create task
PATCH  /api/tasks/:id               # Update task
DELETE /api/tasks/:id               # Delete task

GET    /api/github/repos            # List repositories
GET    /api/github/repos/:repo/commits  # Get commits
```

## 🚂 Deployment (Railway)

1. Create a new Railway project
2. Connect your GitHub repository
3. Add environment variables from `.env.example`
4. Deploy!

```bash
# Or use Railway CLI
railway login
railway init
railway up
```

## 📊 Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Language | TypeScript |
| Discord | discord.js v14 |
| Database | Supabase (PostgreSQL) |
| GitHub | Octokit + simple-git |
| AI | OpenAI GPT-4 |
| API | Express.js |
| Deployment | Railway |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **Issues**: GitHub Issues
- **Discord**: SoulTech Development Server
- **Docs**: `/docs` folder

---

Built with ❤️ by SoulTech
