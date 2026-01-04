/**
 * Ultra ACE - REST API Server
 * Express API for web dashboard integration
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { log } from '../utils/logger';
import { projectService, taskService, noteService, githubService } from '../services';
import type { JWTPayload } from '../types';

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: process.env.API_CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_POINTS || '100', 10),
  duration: parseInt(process.env.RATE_LIMIT_DURATION || '60', 10),
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch {
    res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
  }
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    log.api(req.method, req.path, res.statusCode, { duration: Date.now() - start });
  });
  next();
});

// Auth middleware
interface AuthenticatedRequest extends Request { user?: JWTPayload; }

function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  }
  try {
    const decoded = jwt.verify(authHeader.substring(7), process.env.API_SECRET!) as JWTPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Project routes
app.get('/api/projects', authenticate, async (req: AuthenticatedRequest, res) => {
  const guildId = req.query.guild_id as string;
  if (!guildId) return res.status(400).json({ success: false, error: { code: 'MISSING_GUILD', message: 'guild_id required' } });
  
  const result = await projectService.list(guildId, {
    page: parseInt(req.query.page as string, 10) || 1,
    limit: parseInt(req.query.limit as string, 10) || 25,
  });
  
  if (!result.success) return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: result.error } });
  res.json({ success: true, data: result.data?.projects, meta: { total: result.data?.total } });
});

app.get('/api/projects/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const result = await projectService.getById(req.params.id);
  if (!result.success) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
  res.json({ success: true, data: result.data });
});

app.post('/api/projects', authenticate, async (req: AuthenticatedRequest, res) => {
  const { name, description, priority, guild_id, github_repo } = req.body;
  if (!name || !guild_id) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name and guild_id required' } });
  
  const result = await projectService.create({ name, description, priority, guild_id, github_repo, owner_id: req.user!.discord_id });
  if (!result.success) return res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: result.error } });
  res.status(201).json({ success: true, data: result.data });
});

app.patch('/api/projects/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const result = await projectService.update(req.params.id, req.body);
  if (!result.success) return res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: result.error } });
  res.json({ success: true, data: result.data });
});

// Task routes
app.get('/api/projects/:projectId/tasks', authenticate, async (req: AuthenticatedRequest, res) => {
  const result = await taskService.listByProject(req.params.projectId, {
    page: parseInt(req.query.page as string, 10) || 1,
    limit: parseInt(req.query.limit as string, 10) || 50,
  });
  if (!result.success) return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: result.error } });
  res.json({ success: true, data: result.data?.tasks, meta: { total: result.data?.total } });
});

app.post('/api/tasks', authenticate, async (req: AuthenticatedRequest, res) => {
  const { project_id, title, description, priority, type, assignee_id } = req.body;
  if (!project_id || !title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'project_id and title required' } });
  
  const result = await taskService.create({ project_id, title, description, priority, type, assignee_id, reporter_id: req.user!.discord_id });
  if (!result.success) return res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: result.error } });
  res.status(201).json({ success: true, data: result.data });
});

app.patch('/api/tasks/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const result = await taskService.update(req.params.id, req.body);
  if (!result.success) return res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: result.error } });
  res.json({ success: true, data: result.data });
});

// GitHub routes
app.get('/api/github/repos', authenticate, async (req: AuthenticatedRequest, res) => {
  const result = await githubService.listRepos();
  if (!result.success) return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: result.error } });
  res.json({ success: true, data: result.data });
});

app.get('/api/github/repos/:repo/commits', authenticate, async (req: AuthenticatedRequest, res) => {
  const count = parseInt(req.query.count as string, 10) || 10;
  const result = await githubService.getRecentCommits(req.params.repo, count);
  if (!result.success) return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: result.error } });
  res.json({ success: true, data: result.data });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log.error('API Error', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

// Start server function
export async function startAPIServer(port: number): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      log.info(`API server listening on port ${port}`);
      resolve();
    });
  });
}

export default app;
