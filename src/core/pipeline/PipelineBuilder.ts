import { Pipeline, PipelineConfig } from './Pipeline';
import { PipelineStage } from './PipelineStage';
import { Logger } from '../../utils/logger';

/**
 * Fluent builder for constructing pipelines.
 * Enforces correct configuration and validates structure.
 */
export class PipelineBuilder<TOutput = unknown> {
  private stages: PipelineStage[] = [];
  private criticalStages: string[] = [];
  private config: Partial<PipelineConfig> = {};

  /**
   * Add a stage to the pipeline.
   * Stages are executed in the order they are added.
   * 
   * @param stage - Pipeline stage to add
   * @returns Builder for chaining
   */
  public addStage(stage: PipelineStage): this {
    this.stages.push(stage);
    return this;
  }

  /**
   * Mark a stage as critical.
   * If a critical stage fails, pipeline execution stops immediately.
   * 
   * @param stageName - Name of critical stage
   * @returns Builder for chaining
   */
  public markCritical(stageName: string): this {
    this.criticalStages.push(stageName);
    return this;
  }

  /**
   * Set logger for pipeline.
   * 
   * @param logger - Logger instance
   * @returns Builder for chaining
   */
  public withLogger(logger: Logger): this {
    this.config.logger = logger;
    return this;
  }

  /**
   * Set timeout for pipeline execution.
   * 
   * @param timeoutMs - Timeout in milliseconds
   * @returns Builder for chaining
   */
  public withTimeout(timeoutMs: number): this {
    this.config.timeoutMs = timeoutMs;
    return this;
  }

  /**
   * Configure whether pipeline continues on non-critical errors.
   * 
   * @param continueOnError - True to continue, false to stop
   * @returns Builder for chaining
   */
  public continueOnError(continueOnError: boolean): this {
    this.config.continueOnError = continueOnError;
    return this;
  }

  /**
   * Build the pipeline.
   * 
   * @returns Configured pipeline instance
   * @throws Error if configuration is invalid
   */
  public build(): Pipeline<TOutput> {
    if (!this.config.logger) {
      throw new Error('Pipeline requires a logger');
    }

    const finalConfig: PipelineConfig = {
      logger: this.config.logger,
      timeoutMs: this.config.timeoutMs,
      continueOnError: this.config.continueOnError ?? false,
    };

    return new Pipeline<TOutput>(
      this.stages,
      finalConfig,
      this.criticalStages
    );
  }
}
