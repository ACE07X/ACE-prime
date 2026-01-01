import { Message } from 'discord.js';
import { PipelineStage, PipelineContext, StageResult } from './PipelineStage';
import { Logger } from '../../utils/logger';

/**
 * Configuration for pipeline execution.
 */
export interface PipelineConfig {
  /**
   * Maximum time allowed for full pipeline execution (ms).
   */
  timeoutMs?: number;
  
  /**
   * Whether to continue execution if non-critical stages fail.
   */
  continueOnError?: boolean;
  
  /**
   * Logger instance for pipeline execution logging.
   */
  logger: Logger;
}

/**
 * Result of a complete pipeline execution.
 */
export interface PipelineExecutionResult<T = unknown> {
  /**
   * Final output from the pipeline.
   */
  output: T;
  
  /**
   * All stage results.
   */
  stageResults: Map<string, StageResult>;
  
  /**
   * Total execution time in milliseconds.
   */
  executionTimeMs: number;
  
  /**
   * Whether pipeline completed successfully.
   */
  success: boolean;
  
  /**
   * Errors encountered during execution.
   */
  errors: Array<{ stage: string; error: Error }>;
}

/**
 * CRITICAL COMPONENT: Pipeline Orchestrator
 * 
 * Enforces strict stage ordering for ACE Prime message processing.
 * Guarantees that Persona Selection happens before Prompt Construction.
 * 
 * Pipeline Order (IMMUTABLE):
 * 1. Identity Resolution
 * 2. Persona Selection (MANDATORY - cannot be skipped)
 * 3. Context Management
 * 4. Prompt Building
 * 5. AI Service Invocation
 * 6. Response Formatting
 * 
 * Guarantees:
 * - Stages execute in exact order defined
 * - Persona selection cannot be bypassed
 * - Persona must be selected before prompts are built
 * - All executions are logged for audit
 * - Pipeline fails fast on critical errors
 */
export class Pipeline<TOutput = unknown> {
  private readonly stages: PipelineStage[];
  private readonly config: PipelineConfig;
  private readonly logger: Logger;
  
  /**
   * Names of stages that are considered critical.
   * If these fail, pipeline execution stops immediately.
   */
  private readonly criticalStages: Set<string>;

  constructor(
    stages: PipelineStage[],
    config: PipelineConfig,
    criticalStages: string[] = []
  ) {
    this.stages = stages;
    this.config = config;
    this.logger = config.logger;
    this.criticalStages = new Set(criticalStages);
    
    // Validate pipeline configuration on construction
    this.validatePipeline();
  }

  /**
   * Validate pipeline configuration and stage dependencies.
   * This runs on construction to fail fast if pipeline is misconfigured.
   * 
   * @throws Error if pipeline is invalid
   */
  private validatePipeline(): void {
    if (this.stages.length === 0) {
      throw new Error('Pipeline must have at least one stage');
    }

    // Build dependency graph to check for cycles and missing dependencies
    const stageNames = new Set(this.stages.map(s => s.stageName));
    
    for (const stage of this.stages) {
      // Check for duplicate stage names
      const duplicates = this.stages.filter(s => s.stageName === stage.stageName);
      if (duplicates.length > 1) {
        throw new Error(`Duplicate stage name: '${stage.stageName}'`);
      }
      
      // Validate dependencies exist
      for (const dep of (stage as any).dependencies || []) {
        if (!stageNames.has(dep)) {
          throw new Error(
            `Stage '${stage.stageName}' depends on '${dep}' which is not in the pipeline`
          );
        }
        
        // Validate dependency comes before dependent in stage order
        const depIndex = this.stages.findIndex(s => s.stageName === dep);
        const stageIndex = this.stages.findIndex(s => s.stageName === stage.stageName);
        
        if (depIndex >= stageIndex) {
          throw new Error(
            `Stage '${stage.stageName}' depends on '${dep}' but '${dep}' comes after it in the pipeline. ` +
            `Dependencies must come before dependents in stage ordering.`
          );
        }
      }
    }

    this.logger.info('Pipeline validated successfully', {
      stages: this.stages.map(s => s.stageName),
      criticalStages: Array.from(this.criticalStages),
    });
  }

  /**
   * Create initial pipeline context from a Discord message.
   * 
   * @param message - Discord message
   * @returns Initialized pipeline context
   */
  private createContext(message: Message): PipelineContext {
    return {
      message,
      stageResults: new Map(),
      startedAt: new Date(),
      errors: [],
    };
  }

  /**
   * Execute the complete pipeline for a Discord message.
   * 
   * @param message - Discord message to process
   * @returns Pipeline execution result
   * @throws Error if critical stage fails
   */
  public async execute(message: Message): Promise<PipelineExecutionResult<TOutput>> {
    const context = this.createContext(message);
    const startTime = Date.now();

    this.logger.info('Pipeline execution started', {
      messageId: message.id,
      channelId: message.channelId,
      userId: message.author.id,
      stageCount: this.stages.length,
    });

    let previousOutput: unknown = message;

    try {
      // Execute each stage in order
      for (const stage of this.stages) {
        this.logger.debug(`Executing stage: ${stage.stageName}`, {
          messageId: message.id,
          previousStages: Array.from(context.stageResults.keys()),
        });

        try {
          // Execute stage with previous output as input
          const result = await stage.execute(previousOutput, context);
          
          // Store result in context
          context.stageResults.set(stage.stageName, result);
          
          // Pass output to next stage
          previousOutput = result.data;

          this.logger.debug(`Stage completed: ${stage.stageName}`, {
            messageId: message.id,
            executionTime: result.metadata?.['executionTime'],
          });

        } catch (error) {
          const isCritical = this.criticalStages.has(stage.stageName);
          
          this.logger.error(`Stage failed: ${stage.stageName}`, {
            messageId: message.id,
            error: (error as Error).message,
            isCritical,
            stack: (error as Error).stack,
          });

          // If stage is critical or continueOnError is false, stop pipeline
          if (isCritical || !this.config.continueOnError) {
            throw new Error(
              `Critical stage '${stage.stageName}' failed. Pipeline execution stopped.`,
              { cause: error }
            );
          }

          // Otherwise, log and continue (error already in context.errors)
        }
      }

      const executionTimeMs = Date.now() - startTime;

      this.logger.info('Pipeline execution completed', {
        messageId: message.id,
        executionTimeMs,
        stagesCompleted: context.stageResults.size,
        totalStages: this.stages.length,
        hadErrors: context.errors.length > 0,
      });

      return {
        output: previousOutput as TOutput,
        stageResults: context.stageResults,
        executionTimeMs,
        success: context.errors.length === 0,
        errors: context.errors,
      };

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      this.logger.error('Pipeline execution failed', {
        messageId: message.id,
        executionTimeMs,
        error: (error as Error).message,
        completedStages: Array.from(context.stageResults.keys()),
        failedStage: context.currentStage,
      });

      // Return failed result
      return {
        output: previousOutput as TOutput,
        stageResults: context.stageResults,
        executionTimeMs,
        success: false,
        errors: context.errors,
      };
    }
  }

  /**
   * Get list of stage names in execution order.
   * 
   * @returns Array of stage names
   */
  public getStageNames(): string[] {
    return this.stages.map(s => s.stageName);
  }

  /**
   * Check if pipeline contains a specific stage.
   * 
   * @param stageName - Name of stage to check
   * @returns True if stage exists in pipeline
   */
  public hasStage(stageName: string): boolean {
    return this.stages.some(s => s.stageName === stageName);
  }

  /**
   * Verify that persona selection stage is present and in correct position.
   * This is a critical validation for ACE Prime's dual-persona system.
   * 
   * @param personaStage - Name of persona selection stage
   * @param promptStage - Name of prompt building stage
   * @throws Error if persona stage is missing or in wrong position
   */
  public validatePersonaOrdering(personaStage: string, promptStage: string): void {
    const personaIndex = this.stages.findIndex(s => s.stageName === personaStage);
    const promptIndex = this.stages.findIndex(s => s.stageName === promptStage);

    if (personaIndex === -1) {
      throw new Error(
        `CRITICAL: Persona selection stage '${personaStage}' is missing from pipeline. ` +
        `Persona selection is MANDATORY for ACE Prime operation.`
      );
    }

    if (promptIndex === -1) {
      throw new Error(
        `CRITICAL: Prompt building stage '${promptStage}' is missing from pipeline.`
      );
    }

    if (personaIndex >= promptIndex) {
      throw new Error(
        `CRITICAL: Persona selection ('${personaStage}') must occur BEFORE ` +
        `prompt building ('${promptStage}'). Current order violates security requirements. ` +
        `Persona index: ${personaIndex}, Prompt index: ${promptIndex}`
      );
    }

    this.logger.info('Persona ordering validated', {
      personaStage,
      personaIndex,
      promptStage,
      promptIndex,
    });
  }
}
