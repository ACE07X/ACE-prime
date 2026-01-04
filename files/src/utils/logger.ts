/**
 * Ultra ACE - Logger Utility
 * Structured logging with Winston
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  
  if (stack) {
    log += `\n${stack}`;
  }
  
  return log;
});

// Create transports based on environment
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
  })
);

// File transports (production only)
if (process.env.NODE_ENV === 'production') {
  const logDir = process.env.LOG_DIR || 'logs';

  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        winston.format.json()
      ),
    })
  );

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
  ],
});

// Create child loggers for different modules
export function createModuleLogger(module: string) {
  return logger.child({ module });
}

// Convenience methods for common log patterns
export const log = {
  info: (message: string, meta?: Record<string, unknown>) => 
    logger.info(message, meta),
  
  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
    if (error instanceof Error) {
      logger.error(message, { ...meta, stack: error.stack, errorMessage: error.message });
    } else {
      logger.error(message, { ...meta, error });
    }
  },
  
  warn: (message: string, meta?: Record<string, unknown>) => 
    logger.warn(message, meta),
  
  debug: (message: string, meta?: Record<string, unknown>) => 
    logger.debug(message, meta),
  
  // Specific log types
  command: (commandName: string, userId: string, guildId: string, meta?: Record<string, unknown>) => 
    logger.info(`Command executed: ${commandName}`, { commandName, userId, guildId, ...meta }),
  
  github: (operation: string, repo: string, meta?: Record<string, unknown>) => 
    logger.info(`GitHub operation: ${operation}`, { operation, repo, ...meta }),
  
  database: (operation: string, table: string, meta?: Record<string, unknown>) => 
    logger.debug(`Database operation: ${operation}`, { operation, table, ...meta }),
  
  api: (method: string, path: string, statusCode: number, meta?: Record<string, unknown>) => 
    logger.info(`API request: ${method} ${path}`, { method, path, statusCode, ...meta }),
};

export default logger;
