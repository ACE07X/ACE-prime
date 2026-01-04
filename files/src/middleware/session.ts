/**
 * Ultra ACE - Session Manager
 * Handles bot activation rules, sessions, and rate limiting
 * 
 * ACTIVATION RULES:
 * 1. Slash commands starting with /ace
 * 2. Messages starting with prefix !ace
 * 3. Direct mention @UltraACE
 * 4. Active session mode (/ace session start)
 */

import { Message, User, Guild, TextChannel } from 'discord.js';
import NodeCache from 'node-cache';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { log } from '../utils/logger';

// ===========================================
// TYPES
// ===========================================

interface Session {
  id: string;
  userId: string;
  channelId: string;
  guildId: string;
  projectId?: string;
  startedAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}

interface ActivationResult {
  activated: boolean;
  reason?: 'slash_command' | 'prefix' | 'mention' | 'session';
  content?: string;  // Cleaned content without prefix
  session?: Session;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn?: number;  // Seconds until reset
}

// ===========================================
// CONFIGURATION
// ===========================================

const CONFIG = {
  PREFIX: '!ace',
  SESSION_TIMEOUT_MINUTES: 30,
  SESSION_MAX_DURATION_HOURS: 8,
  RATE_LIMIT_POINTS: 10,      // Commands per window
  RATE_LIMIT_DURATION: 60,    // Window in seconds
  RATE_LIMIT_BLOCK: 120,      // Block duration when exceeded
};

// ===========================================
// SESSION MANAGER
// ===========================================

export class SessionManager {
  private sessions: NodeCache;
  private rateLimiter: RateLimiterMemory;
  private botUserId: string = '';

  constructor() {
    // Session cache with auto-expiry
    this.sessions = new NodeCache({
      stdTTL: CONFIG.SESSION_TIMEOUT_MINUTES * 60,
      checkperiod: 60,
      useClones: false,
    });

    // Rate limiter per user
    this.rateLimiter = new RateLimiterMemory({
      points: CONFIG.RATE_LIMIT_POINTS,
      duration: CONFIG.RATE_LIMIT_DURATION,
      blockDuration: CONFIG.RATE_LIMIT_BLOCK,
    });

    // Clean up expired sessions
    this.sessions.on('expired', (key: string, session: Session) => {
      log.info('Session expired', { userId: session.userId, channelId: session.channelId });
    });
  }

  /**
   * Set the bot's user ID (called after client ready)
   */
  setBotUserId(userId: string): void {
    this.botUserId = userId;
  }

  // ===========================================
  // ACTIVATION CHECKING
  // ===========================================

  /**
   * Check if a message should activate the bot
   */
  checkActivation(message: Message): ActivationResult {
    // Never respond to bots
    if (message.author.bot) {
      return { activated: false };
    }

    const content = message.content.trim();

    // Check 1: Prefix activation (!ace)
    if (content.toLowerCase().startsWith(CONFIG.PREFIX.toLowerCase())) {
      const cleanedContent = content.substring(CONFIG.PREFIX.length).trim();
      return {
        activated: true,
        reason: 'prefix',
        content: cleanedContent,
      };
    }

    // Check 2: Direct mention (@UltraACE)
    if (this.botUserId && message.mentions.users.has(this.botUserId)) {
      // Remove the mention from content
      const cleanedContent = content
        .replace(new RegExp(`<@!?${this.botUserId}>`, 'g'), '')
        .trim();
      
      return {
        activated: true,
        reason: 'mention',
        content: cleanedContent,
      };
    }

    // Check 3: Active session
    const session = this.getSession(message.author.id, message.channelId);
    if (session) {
      // Update last activity
      this.touchSession(message.author.id, message.channelId);
      
      return {
        activated: true,
        reason: 'session',
        content: content,
        session,
      };
    }

    return { activated: false };
  }

  /**
   * Check if this is a slash command activation
   * (Called from interaction handler, not message handler)
   */
  isSlashCommandActivation(commandName: string): boolean {
    // All slash commands are considered activation
    // The command name check ensures only our registered commands work
    return true;
  }

  // ===========================================
  // SESSION MANAGEMENT
  // ===========================================

  /**
   * Start a new session
   */
  startSession(
    userId: string,
    channelId: string,
    guildId: string,
    projectId?: string
  ): Session {
    const sessionKey = this.getSessionKey(userId, channelId);
    
    const session: Session = {
      id: `session_${Date.now()}_${userId}`,
      userId,
      channelId,
      guildId,
      projectId,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + CONFIG.SESSION_MAX_DURATION_HOURS * 60 * 60 * 1000),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionKey, session);
    
    log.info('Session started', { userId, channelId, projectId });
    
    return session;
  }

  /**
   * End a session
   */
  endSession(userId: string, channelId: string): boolean {
    const sessionKey = this.getSessionKey(userId, channelId);
    const existed = this.sessions.has(sessionKey);
    
    this.sessions.del(sessionKey);
    
    if (existed) {
      log.info('Session ended', { userId, channelId });
    }
    
    return existed;
  }

  /**
   * Get an active session
   */
  getSession(userId: string, channelId: string): Session | undefined {
    const sessionKey = this.getSessionKey(userId, channelId);
    const session = this.sessions.get<Session>(sessionKey);
    
    if (session) {
      // Check if session has exceeded max duration
      if (new Date() > session.expiresAt) {
        this.sessions.del(sessionKey);
        return undefined;
      }
      return session;
    }
    
    return undefined;
  }

  /**
   * Update session last activity (extends timeout)
   */
  touchSession(userId: string, channelId: string): void {
    const sessionKey = this.getSessionKey(userId, channelId);
    const session = this.sessions.get<Session>(sessionKey);
    
    if (session) {
      session.lastActivity = new Date();
      // Reset TTL
      this.sessions.set(sessionKey, session);
    }
  }

  /**
   * Link a project to a session
   */
  linkProjectToSession(userId: string, channelId: string, projectId: string): boolean {
    const session = this.getSession(userId, channelId);
    
    if (session) {
      session.projectId = projectId;
      this.sessions.set(this.getSessionKey(userId, channelId), session);
      return true;
    }
    
    return false;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { active: number; keys: string[] } {
    const keys = this.sessions.keys();
    return {
      active: keys.length,
      keys,
    };
  }

  private getSessionKey(userId: string, channelId: string): string {
    return `${userId}:${channelId}`;
  }

  // ===========================================
  // RATE LIMITING
  // ===========================================

  /**
   * Check rate limit for a user
   */
  async checkRateLimit(userId: string): Promise<RateLimitResult> {
    try {
      const result = await this.rateLimiter.consume(userId);
      
      return {
        allowed: true,
        remaining: result.remainingPoints,
      };
    } catch (error: any) {
      // Rate limited
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil(error.msBeforeNext / 1000),
      };
    }
  }

  /**
   * Get current rate limit status without consuming a point
   */
  async getRateLimitStatus(userId: string): Promise<RateLimitResult> {
    try {
      const result = await this.rateLimiter.get(userId);
      
      if (!result) {
        return { allowed: true, remaining: CONFIG.RATE_LIMIT_POINTS };
      }
      
      return {
        allowed: result.remainingPoints > 0,
        remaining: result.remainingPoints,
        resetIn: Math.ceil(result.msBeforeNext / 1000),
      };
    } catch {
      return { allowed: true, remaining: CONFIG.RATE_LIMIT_POINTS };
    }
  }

  // ===========================================
  // PERMISSION CHECKING
  // ===========================================

  /**
   * Check if user has permission for an action
   */
  async checkPermission(
    userId: string,
    guildId: string,
    permission: 'manage_projects' | 'manage_tasks' | 'use_github' | 'admin'
  ): Promise<boolean> {
    // This would integrate with the database to check roles
    // For now, allow all actions
    // TODO: Implement proper permission checking from database
    return true;
  }

  /**
   * Check if user is a server admin
   */
  isServerAdmin(member: any): boolean {
    if (!member) return false;
    return member.permissions?.has('Administrator') || false;
  }
}

// ===========================================
// MESSAGE ROUTER
// ===========================================

export class CommandRouter {
  private sessionManager: SessionManager;
  private prefixHandlers: Map<string, (content: string, message: Message) => Promise<void>>;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.prefixHandlers = new Map();

    // Register prefix command handlers
    this.registerPrefixHandlers();
  }

  private registerPrefixHandlers(): void {
    // !ace help
    this.prefixHandlers.set('help', async (content, message) => {
      await message.reply({
        embeds: [{
          title: '🤖 Ultra ACE Help',
          color: 0x5865f2,
          description: `**Activation Methods:**
• \`/ace\` - Slash commands (recommended)
• \`!ace <command>\` - Prefix commands
• \`@UltraACE <message>\` - Mention the bot
• \`/ace session start\` - Start interactive session

**Quick Commands:**
• \`!ace project list\` - List projects
• \`!ace task list <project>\` - List tasks
• \`!ace ask <question>\` - Ask the AI
• \`!ace session start\` - Start session mode`,
          footer: { text: 'Use /ace for full command list' },
        }],
      });
    });

    // !ace session start
    this.prefixHandlers.set('session', async (content, message) => {
      const args = content.split(' ');
      const action = args[0]?.toLowerCase();

      if (action === 'start') {
        const session = this.sessionManager.startSession(
          message.author.id,
          message.channelId,
          message.guildId!
        );
        await message.reply(`✅ Session started! I'll respond to all your messages in this channel for the next ${CONFIG.SESSION_TIMEOUT_MINUTES} minutes.\n\nUse \`!ace session end\` or \`/ace session end\` to stop.`);
      } else if (action === 'end' || action === 'stop') {
        const ended = this.sessionManager.endSession(message.author.id, message.channelId);
        if (ended) {
          await message.reply('✅ Session ended. Use `!ace` or mention me to interact.');
        } else {
          await message.reply('❌ No active session found.');
        }
      } else if (action === 'status') {
        const session = this.sessionManager.getSession(message.author.id, message.channelId);
        if (session) {
          const remaining = Math.ceil((session.expiresAt.getTime() - Date.now()) / 60000);
          await message.reply(`📊 Session active\n• Started: ${session.startedAt.toLocaleTimeString()}\n• Expires in: ${remaining} minutes`);
        } else {
          await message.reply('No active session.');
        }
      } else {
        await message.reply('Usage: `!ace session <start|end|status>`');
      }
    });

    // !ace ping
    this.prefixHandlers.set('ping', async (content, message) => {
      const latency = Date.now() - message.createdTimestamp;
      await message.reply(`🏓 Pong! Latency: ${latency}ms`);
    });
  }

  /**
   * Route a prefix command
   */
  async routePrefixCommand(content: string, message: Message): Promise<boolean> {
    const parts = content.split(' ');
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1).join(' ');

    const handler = this.prefixHandlers.get(command);
    
    if (handler) {
      await handler(args, message);
      return true;
    }

    // Default: send to AI if no specific handler
    if (content.length > 0) {
      // This would integrate with the AI service
      await message.reply(`I received: "${content}"\n\nFor full AI features, use \`/ace ask\` or start a session with \`!ace session start\`.`);
      return true;
    }

    return false;
  }
}

// ===========================================
// EXPORTS
// ===========================================

export const sessionManager = new SessionManager();
export const commandRouter = new CommandRouter(sessionManager);

export default sessionManager;
