import * as fs from 'fs';
import * as path from 'path';
import { PromptValidator } from './PromptValidator';
import { Logger } from '../../utils/logger';

/**
 * Configuration for prompt loading.
 */
export interface PromptLoaderConfig {
  /**
   * Base directory containing prompt files.
   * Defaults to './prompts' relative to project root.
   */
  promptsDirectory?: string;

  /**
   * Enable hot-reloading of prompts in development mode.
   * When enabled, prompts are reloaded from disk on each request.
   * Should be false in production for performance.
   */
  enableHotReload?: boolean;

  /**
   * Logger for prompt loading events.
   */
  logger: Logger;
}

/**
 * Known prompt file types.
 * Maps semantic names to actual file names.
 */
export enum PromptType {
  BUTLER_SYSTEM = 'butler.system.md',
  SUPERVISOR_SYSTEM = 'supervisor.system.md',
  DEVELOPER = 'developer.md',
}

/**
 * Pure I/O layer for loading prompt files from disk.
 * 
 * Responsibilities:
 * - Load prompt text from files
 * - Cache prompts in memory
 * - Validate prompt content
 * - Support hot-reload in development
 * 
 * NOT Responsible For:
 * - Prompt composition or assembly
 * - Persona logic
 * - Context injection
 * - AI service interaction
 */
export class PromptLoader {
  private readonly config: Required<PromptLoaderConfig>;
  private readonly logger: Logger;
  
  /**
   * In-memory cache of loaded prompts.
   * Key: PromptType enum value (filename)
   * Value: Prompt text content
   */
  private readonly cache: Map<PromptType, string>;

  /**
   * Track which prompts have been validated to avoid redundant validation.
   */
  private readonly validated: Set<PromptType>;

  constructor(config: PromptLoaderConfig) {
    this.config = {
      promptsDirectory: config.promptsDirectory || path.join(process.cwd(), 'prompts'),
      // Use bracket notation for safe environment variable access
      enableHotReload: config.enableHotReload ?? process.env['NODE_ENV'] === 'development',
      logger: config.logger,
    };
    
    this.logger = config.logger;
    this.cache = new Map();
    this.validated = new Set();

    this.logger.info('PromptLoader initialized', {
      promptsDirectory: this.config.promptsDirectory,
      enableHotReload: this.config.enableHotReload,
    });
  }

  /**
   * Get full file path for a prompt type.
   * 
   * @param promptType - Type of prompt to load
   * @returns Absolute file path
   */
  private getPromptPath(promptType: PromptType): string {
    return path.join(this.config.promptsDirectory, promptType);
  }

  /**
   * Load prompt text from disk.
   * 
   * @param promptType - Type of prompt to load
   * @returns Prompt text content
   * @throws Error if file doesn't exist or can't be read
   */
  private loadFromDisk(promptType: PromptType): string {
    const filePath = this.getPromptPath(promptType);

    this.logger.debug(`Loading prompt from disk: ${promptType}`, { filePath });

    // Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Prompt file not found: ${promptType}. ` +
        `Expected at: ${filePath}. ` +
        `Ensure prompt files are present in the prompts directory.`
      );
    }

    // Read file
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read prompt file: ${promptType}. ` +
        `Path: ${filePath}. ` +
        `Error: ${(error as Error).message}`,
        { cause: error }
      );
    }

    this.logger.debug(`Prompt loaded from disk: ${promptType}`, {
      filePath,
      contentLength: content.length,
    });

    return content;
  }

  /**
   * Validate prompt content after loading.
   * 
   * @param promptText - Text to validate
   * @param promptType - Type of prompt (for error messages)
   * @throws Error if validation fails
   */
  private validatePrompt(promptText: string, promptType: PromptType): void {
    try {
      // Basic validation
      PromptValidator.validate(promptText, promptType);

      // Minimum length check (at least 10 characters)
      PromptValidator.validateMinLength(promptText, promptType, 10);

      // Maximum length check (no more than 10000 characters for system prompts)
      PromptValidator.validateMaxLength(promptText, promptType, 10000);

      this.logger.debug(`Prompt validated: ${promptType}`);
    } catch (error) {
      this.logger.error(`Prompt validation failed: ${promptType}`, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Load a prompt by type.
   * Uses cache if available and hot-reload is disabled.
   * 
   * @param promptType - Type of prompt to load
   * @returns Prompt text content
   * @throws Error if prompt cannot be loaded or is invalid
   */
  public load(promptType: PromptType): string {
    // If hot-reload enabled, always load from disk
    if (this.config.enableHotReload) {
      this.logger.debug(`Hot-reload enabled, loading from disk: ${promptType}`);
      const content = this.loadFromDisk(promptType);
      this.validatePrompt(content, promptType);
      return content;
    }

    // Check cache first
    const cached = this.cache.get(promptType);
    if (cached !== undefined) {
      this.logger.debug(`Returning cached prompt: ${promptType}`);
      return cached;
    }

    // Load from disk
    const content = this.loadFromDisk(promptType);

    // Validate if not already validated
    if (!this.validated.has(promptType)) {
      this.validatePrompt(content, promptType);
      this.validated.add(promptType);
    }

    // Store in cache
    this.cache.set(promptType, content);

    this.logger.info(`Prompt loaded and cached: ${promptType}`, {
      contentLength: content.length,
    });

    return content;
  }

  /**
   * Preload all known prompts into cache.
   * Useful for startup validation and performance.
   * 
   * @throws Error if any prompt fails to load
   */
  public preloadAll(): void {
    this.logger.info('Preloading all prompts...');

    const promptTypes = Object.values(PromptType);
    const results: Array<{ type: PromptType; success: boolean; error?: string }> = [];

    for (const promptType of promptTypes) {
      try {
        this.load(promptType);
        results.push({ type: promptType, success: true });
      } catch (error) {
        const errorMessage = (error as Error).message;
        results.push({ type: promptType, success: false, error: errorMessage });
        
        this.logger.error(`Failed to preload prompt: ${promptType}`, {
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    if (failureCount > 0) {
      const failedPrompts = results
        .filter(r => !r.success)
        .map(r => `${r.type}: ${r.error}`)
        .join('; ');

      throw new Error(
        `Failed to preload ${failureCount} prompt(s): ${failedPrompts}`
      );
    }

    this.logger.info('All prompts preloaded successfully', {
      count: successCount,
      prompts: promptTypes,
    });
  }

  /**
   * Clear the prompt cache.
   * Useful for testing or forcing reload.
   */
  public clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    this.validated.clear();
    
    this.logger.info('Prompt cache cleared', {
      clearedEntries: cacheSize,
    });
  }

  /**
   * Get cache statistics for monitoring.
   * 
   * @returns Cache statistics
   */
  public getCacheStats(): {
    size: number;
    hotReloadEnabled: boolean;
    cachedPrompts: PromptType[];
  } {
    return {
      size: this.cache.size,
      hotReloadEnabled: this.config.enableHotReload,
      cachedPrompts: Array.from(this.cache.keys()),
    };
  }

  /**
   * Check if a specific prompt is loaded in cache.
   * 
   * @param promptType - Type of prompt to check
   * @returns True if cached
   */
  public isCached(promptType: PromptType): boolean {
    return this.cache.has(promptType);
  }
}
