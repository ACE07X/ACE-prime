/**
 * Ultra ACE - Configuration Loader
 * Loads and validates environment configuration
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import type { BotConfig } from '../types';

// Load environment variables
dotenvConfig();

// Configuration schema with validation
const configSchema = z.object({
  discord: z.object({
    token: z.string().min(1, 'DISCORD_TOKEN is required'),
    clientId: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
    guildId: z.string().optional(),
  }),
  supabase: z.object({
    url: z.string().url('SUPABASE_URL must be a valid URL'),
    anonKey: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
    serviceRoleKey: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  }),
  github: z.object({
    token: z.string().min(1, 'GITHUB_TOKEN is required'),
    org: z.string().min(1, 'GITHUB_ORG is required'),
    defaultBranch: z.string().default('main'),
  }),
  openai: z.object({
    apiKey: z.string().min(1, 'OPENAI_API_KEY is required'),
    model: z.string().default('gpt-4-turbo-preview'),
  }),
  api: z.object({
    port: z.number().int().positive().default(3000),
    secret: z.string().min(32, 'API_SECRET must be at least 32 characters'),
    corsOrigin: z.string().default('http://localhost:5173'),
  }),
  app: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    timezone: z.string().default('UTC'),
  }),
  limits: z.object({
    ratePoints: z.number().int().positive().default(10),
    rateDuration: z.number().int().positive().default(60),
    maxFileSize: z.number().int().positive().default(25),
    allowedFileTypes: z.array(z.string()).default(['.ts', '.js', '.py', '.md', '.json']),
    maxContextMessages: z.number().int().positive().default(50),
    contextTTLHours: z.number().int().positive().default(168),
  }),
});

/**
 * Parse and validate configuration from environment
 */
function loadConfig(): BotConfig {
  const rawConfig = {
    discord: {
      token: process.env.DISCORD_TOKEN || '',
      clientId: process.env.DISCORD_CLIENT_ID || '',
      guildId: process.env.DISCORD_GUILD_ID,
    },
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    github: {
      token: process.env.GITHUB_TOKEN || '',
      org: process.env.GITHUB_ORG || '',
      defaultBranch: process.env.GITHUB_DEFAULT_BRANCH || 'main',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    },
    api: {
      port: parseInt(process.env.API_PORT || '3000', 10),
      secret: process.env.API_SECRET || '',
      corsOrigin: process.env.API_CORS_ORIGIN || 'http://localhost:5173',
    },
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      timezone: process.env.TIMEZONE || 'UTC',
    },
    limits: {
      ratePoints: parseInt(process.env.RATE_LIMIT_POINTS || '10', 10),
      rateDuration: parseInt(process.env.RATE_LIMIT_DURATION || '60', 10),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
      allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || '.ts,.js,.py,.md,.json').split(','),
      maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES || '50', 10),
      contextTTLHours: parseInt(process.env.CONTEXT_TTL_HOURS || '168', 10),
    },
  };

  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return result.data as BotConfig;
}

// Export singleton config
export const config = loadConfig();

// Export individual sections for convenience
export const discordConfig = config.discord;
export const supabaseConfig = config.supabase;
export const githubConfig = config.github;
export const openaiConfig = config.openai;
export const apiConfig = config.api;
export const appConfig = config.app;
export const limitsConfig = config.limits;

export default config;
