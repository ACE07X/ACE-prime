/**
 * Structured logger interface.
 * Implementation can be Winston, Pino, or custom.
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Simple console logger for initial implementation.
 * Replace with production logger (Winston/Pino) later.
 */
export class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}`, meta || '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, meta || '');
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    // Use bracket notation for safe environment variable access
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  }
}
