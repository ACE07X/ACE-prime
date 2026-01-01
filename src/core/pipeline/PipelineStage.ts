import { Message } from 'discord.js';

/**
 * Result from a pipeline stage execution.
 * Contains processed data and metadata for the next stage.
 */
export interface StageResult<T = unknown> {
  /**
   * Data produced by this stage, passed to next stage.
   */
  data: T;
  
  /**
   * Stage name for logging and debugging.
   */
  stageName: string;
  
  /**
   * Timestamp when stage completed.
   */
  completedAt: Date;
  
  /**
   * Optional metadata for audit/debugging.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Context object passed through all pipeline stages.
 * Accumulates data as it flows through the pipeline.
 */
export interface PipelineContext {
  /**
   * Original Discord message that triggered the pipeline.
   */
  message: Message;
  
  /**
   * Results from completed stages, keyed by stage name.
   */
  stageResults: Map<string, StageResult>;
  
  /**
   * Pipeline execution start time.
   */
  startedAt: Date;
  
  /**
   * Current stage being executed.
   */
  currentStage?: string;
  
  /**
   * Errors encountered during pipeline execution.
   */
  errors: Array<{ stage: string; error: Error }>;
}

/**
 * Abstract base class for all pipeline stages.
 * Enforces consistent structure and error handling.
 */
export abstract class PipelineStage<TInput = unknown, TOutput = unknown> {
  /**
   * Unique name for this stage (used in logging and stage order).
   */
  public readonly stageName: string;
  
  /**
   * Names of stages that must complete before this stage.
   * Used to enforce dependencies and ordering.
   */
  protected readonly dependencies: string[];

  constructor(stageName: string, dependencies: string[] = []) {
    this.stageName = stageName;
    this.dependencies = dependencies;
  }

  /**
   * Validate that all required dependencies have completed.
   * 
   * @param context - Pipeline context
   * @throws Error if dependencies are not met
   */
  protected validateDependencies(context: PipelineContext): void {
    for (const dependency of this.dependencies) {
      if (!context.stageResults.has(dependency)) {
        throw new Error(
          `Stage '${this.stageName}' requires '${dependency}' to complete first. ` +
          `Current stages: [${Array.from(context.stageResults.keys()).join(', ')}]`
        );
      }
    }
  }

  /**
   * Get result from a previous stage.
   * 
   * @param context - Pipeline context
   * @param stageName - Name of the stage to get result from
   * @returns Stage result data
   * @throws Error if stage hasn't completed
   */
  protected getStageResult<T = unknown>(
    context: PipelineContext,
    stageName: string
  ): T {
    const result = context.stageResults.get(stageName);
    if (!result) {
      throw new Error(
        `Stage '${this.stageName}' attempted to access result from '${stageName}' ` +
        `but that stage has not completed.`
      );
    }
    return result.data as T;
  }

  /**
   * Execute this stage with input from previous stage.
   * Must be implemented by concrete stage classes.
   * 
   * @param input - Input data from previous stage
   * @param context - Full pipeline context
   * @returns Output data for next stage
   */
  protected abstract executeStage(
    input: TInput,
    context: PipelineContext
  ): Promise<TOutput> | TOutput;

  /**
   * Execute this stage with full error handling and validation.
   * This method is called by the Pipeline orchestrator.
   * 
   * @param input - Input data
   * @param context - Pipeline context
   * @returns Stage result with metadata
   */
  public async execute(
    input: TInput,
    context: PipelineContext
  ): Promise<StageResult<TOutput>> {
    // Validate dependencies before execution
    this.validateDependencies(context);
    
    // Update context to track current stage
    context.currentStage = this.stageName;
    
    try {
      // Execute the stage logic
      const data = await this.executeStage(input, context);
      
      // Create result object
      const result: StageResult<TOutput> = {
        data,
        stageName: this.stageName,
        completedAt: new Date(),
        metadata: {
          executionTime: Date.now() - context.startedAt.getTime(),
        },
      };
      
      return result;
    } catch (error) {
      // Log error in context
      context.errors.push({
        stage: this.stageName,
        error: error as Error,
      });
      
      // Re-throw for pipeline to handle
      throw new Error(
        `Stage '${this.stageName}' failed: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }
}
