import { PersonaSelection, PersonaType } from '../../types/persona.types';
import { PromptLoader, PromptType } from './PromptLoader';
import { Logger } from '../../utils/logger';

/**
 * Structured message for LLM consumption.
 * Compatible with OpenAI Messages API format.
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Context summary to be injected into prompts.
 * Must be pre-summarized before reaching PromptBuilder.
 */
export interface ContextSummary {
  /**
   * Conversation history summary (if any).
   */
  conversationSummary?: string;

  /**
   * Project context summary (if any).
   */
  projectContext?: string;

  /**
   * User preferences or settings (if any).
   */
  userPreferences?: string;

  /**
   * Any additional context as key-value pairs.
   */
  additionalContext?: Record<string, string>;
}

/**
 * Input required to build a complete prompt.
 */
export interface PromptBuildInput {
  /**
   * Persona selection (MANDATORY).
   * Determines which system prompt to use.
   */
  personaSelection: PersonaSelection;

  /**
   * User's message content.
   * This is the actual message from Discord.
   */
  userMessage: string;

  /**
   * Pre-summarized context (optional).
   * If provided, must already be summarized to fit token limits.
   */
  context?: ContextSummary;
}

/**
 * Complete prompt payload ready for LLM.
 */
export interface BuiltPrompt {
  /**
   * Array of messages in correct order for LLM.
   */
  messages: LLMMessage[];

  /**
   * Metadata about the built prompt.
   */
  metadata: {
    persona: PersonaType;
    userId: string;
    messageId: string;
    builtAt: Date;
    hasContext: boolean;
  };
}

/**
 * CRITICAL COMPONENT: Prompt Assembly Layer
 * 
 * Assembles final LLM prompts by combining:
 * 1. Persona-specific system prompt (Butler or Supervisor)
 * 2. Developer prompt (always included)
 * 3. Context summary (if provided)
 * 4. User message (always last)
 * 
 * Assembly Order (NON-NEGOTIABLE):
 * ┌─────────────────────────────────────┐
 * │ 1. System Prompt (Persona-Specific) │ ← Butler or Supervisor
 * ├─────────────────────────────────────┤
 * │ 2. Developer Prompt                 │ ← Always included
 * ├─────────────────────────────────────┤
 * │ 3. Context Block (if present)       │ ← Pre-summarized
 * ├─────────────────────────────────────┤
 * │ 4. User Message                     │ ← Always last, never altered
 * └─────────────────────────────────────┘
 * 
 * Security Guarantees:
 * - PersonaSelection is MANDATORY (fails if missing)
 * - Persona type must be valid (fails on unknown persona)
 * - All prompts must be loaded successfully (fails if missing)
 * - Assembly order is enforced programmatically
 * - No silent fallbacks or defaults
 * 
 * NOT Responsible For:
 * - Loading prompt files (PromptLoader's job)
 * - Selecting persona (PersonaSelector's job)
 * - Calling AI services (AIService's job)
 * - Summarizing context (ContextManager's job)
 * - Validating prompt files (PromptValidator's job)
 */
export class PromptBuilder {
  private readonly promptLoader: PromptLoader;
  private readonly logger: Logger;

  constructor(promptLoader: PromptLoader, logger: Logger) {
    this.promptLoader = promptLoader;
    this.logger = logger;
  }

  /**
   * Validate that PersonaSelection is present and valid.
   * 
   * @param personaSelection - Persona selection to validate
   * @throws Error if validation fails
   */
  private validatePersonaSelection(personaSelection: PersonaSelection | undefined): asserts personaSelection is PersonaSelection {
    if (!personaSelection) {
      throw new Error(
        'PromptBuilder requires PersonaSelection. ' +
        'PersonaSelection must be completed before prompt building. ' +
        'This indicates a pipeline ordering violation.'
      );
    }

    // Validate persona type is known
    const validPersonas = Object.values(PersonaType);
    if (!validPersonas.includes(personaSelection.persona)) {
      throw new Error(
        `Unknown persona type: '${personaSelection.persona}'. ` +
        `Valid personas: ${validPersonas.join(', ')}`
      );
    }
  }

  /**
   * Load persona-specific system prompt.
   * 
   * @param persona - Persona type
   * @returns Loaded system prompt text
   * @throws Error if prompt cannot be loaded
   */
  private loadSystemPrompt(persona: PersonaType): string {
    const promptType = persona === PersonaType.BUTLER
      ? PromptType.BUTLER_SYSTEM
      : PromptType.SUPERVISOR_SYSTEM;

    try {
      const prompt = this.promptLoader.load(promptType);
      
      if (!prompt || prompt.trim().length === 0) {
        throw new Error(`System prompt for ${persona} is empty`);
      }

      this.logger.debug(`Loaded system prompt for persona: ${persona}`, {
        promptType,
        length: prompt.length,
      });

      return prompt;
    } catch (error) {
      throw new Error(
        `Failed to load system prompt for persona '${persona}': ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Load developer prompt.
   * Developer prompt is always included regardless of persona.
   * 
   * @returns Loaded developer prompt text
   * @throws Error if prompt cannot be loaded
   */
  private loadDeveloperPrompt(): string {
    try {
      const prompt = this.promptLoader.load(PromptType.DEVELOPER);
      
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Developer prompt is empty');
      }

      this.logger.debug('Loaded developer prompt', {
        length: prompt.length,
      });

      return prompt;
    } catch (error) {
      throw new Error(
        `Failed to load developer prompt: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Format context summary into a structured text block.
   * 
   * @param context - Context summary object
   * @returns Formatted context text
   */
  private formatContextBlock(context: ContextSummary): string {
    const parts: string[] = [];

    if (context.conversationSummary) {
      parts.push(`Conversation Context:\n${context.conversationSummary}`);
    }

    if (context.projectContext) {
      parts.push(`Project Context:\n${context.projectContext}`);
    }

    if (context.userPreferences) {
      parts.push(`User Preferences:\n${context.userPreferences}`);
    }

    if (context.additionalContext) {
      const additionalParts = Object.entries(context.additionalContext)
        .map(([key, value]) => `${key}:\n${value}`)
        .join('\n\n');
      
      if (additionalParts) {
        parts.push(additionalParts);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Assemble complete system message from components.
   * 
   * Assembly Order:
   * 1. System prompt (persona-specific)
   * 2. Developer prompt
   * 3. Context block (if present)
   * 
   * This order is NON-NEGOTIABLE and enforced programmatically.
   * 
   * @param systemPrompt - Persona-specific system prompt
   * @param developerPrompt - Developer guidelines prompt
   * @param context - Optional context summary
   * @returns Complete system message content
   */
  private assembleSystemMessage(
    systemPrompt: string,
    developerPrompt: string,
    context?: ContextSummary
  ): string {
    // Start with required components in exact order
    const components: string[] = [
      systemPrompt,      // 1. Persona-specific system prompt (FIRST)
      developerPrompt,   // 2. Developer prompt (SECOND)
    ];

    // Add optional context block (THIRD, if present)
    if (context) {
      const contextBlock = this.formatContextBlock(context);
      if (contextBlock.trim().length > 0) {
        components.push(`\n--- Context ---\n${contextBlock}`);
      }
    }

    // Join all components with clear separation
    return components.join('\n\n');
  }

  /**
   * Build complete prompt payload ready for LLM.
   * 
   * This is the main entry point for prompt assembly.
   * 
   * Enforces:
   * - PersonaSelection is mandatory
   * - All prompts must load successfully
   * - Assembly order is strictly maintained
   * - User message is never altered
   * 
   * @param input - All required input for building prompt
   * @returns Complete prompt payload ready for LLM
   * @throws Error if any validation fails or prompts cannot be loaded
   */
  public build(input: PromptBuildInput): BuiltPrompt {
    const startTime = Date.now();

    this.logger.debug('Building prompt', {
      messageId: input.personaSelection?.messageId,
      persona: input.personaSelection?.persona,
      hasContext: !!input.context,
    });

    try {
      // CRITICAL: Validate PersonaSelection exists and is valid
      this.validatePersonaSelection(input.personaSelection);

      // Validate user message is present
      if (!input.userMessage || input.userMessage.trim().length === 0) {
        throw new Error('User message is required and cannot be empty');
      }

      // Load required prompts
      const systemPrompt = this.loadSystemPrompt(input.personaSelection.persona);
      const developerPrompt = this.loadDeveloperPrompt();

      // Assemble system message in correct order
      const systemMessageContent = this.assembleSystemMessage(
        systemPrompt,
        developerPrompt,
        input.context
      );

      // Build final messages array
      // Order: [system message, user message]
      // User message is ALWAYS last and NEVER modified
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: systemMessageContent,
        },
        {
          role: 'user',
          content: input.userMessage, // Never altered
        },
      ];

      // Create metadata
      const metadata = {
        persona: input.personaSelection.persona,
        userId: input.personaSelection.userId,
        messageId: input.personaSelection.messageId,
        builtAt: new Date(),
        hasContext: !!input.context,
      };

      const executionTime = Date.now() - startTime;

      this.logger.info('Prompt built successfully', {
        persona: metadata.persona,
        messageId: metadata.messageId,
        messageCount: messages.length,
        systemMessageLength: systemMessageContent.length,
        userMessageLength: input.userMessage.length,
        executionTimeMs: executionTime,
      });

      return {
        messages,
        metadata,
      };

    } catch (error) {
      this.logger.error('Prompt building failed', {
        error: (error as Error).message,
        messageId: input.personaSelection?.messageId,
        persona: input.personaSelection?.persona,
      });

      throw error;
    }
  }

  /**
   * Validate a built prompt before sending to LLM.
   * Performs final sanity checks.
   * 
   * @param builtPrompt - Prompt to validate
   * @throws Error if validation fails
   */
  public validate(builtPrompt: BuiltPrompt): void {
    // Must have at least system + user message
    if (builtPrompt.messages.length < 2) {
      throw new Error(
        `Invalid prompt: Expected at least 2 messages (system + user), got ${builtPrompt.messages.length}`
      );
    }

    // First message must be system
    if (builtPrompt.messages[0]?.role !== 'system') {
      throw new Error(
        `Invalid prompt: First message must be 'system' role, got '${builtPrompt.messages[0]?.role}'`
      );
    }

    // Last message must be user
    const lastMessage = builtPrompt.messages[builtPrompt.messages.length - 1];
    if (lastMessage?.role !== 'user') {
      throw new Error(
        `Invalid prompt: Last message must be 'user' role, got '${lastMessage?.role}'`
      );
    }

    // All messages must have non-empty content
    for (const message of builtPrompt.messages) {
      if (!message.content || message.content.trim().length === 0) {
        throw new Error(
          `Invalid prompt: Message with role '${message.role}' has empty content`
        );
      }
    }

    this.logger.debug('Prompt validation passed', {
      messageCount: builtPrompt.messages.length,
      persona: builtPrompt.metadata.persona,
    });
  }

  /**
   * Build and validate prompt in a single call.
   * Convenience method that ensures validation always happens.
   * 
   * @param input - Input for building prompt
   * @returns Validated prompt payload
   * @throws Error if building or validation fails
   */
  public buildAndValidate(input: PromptBuildInput): BuiltPrompt {
    const builtPrompt = this.build(input);
    this.validate(builtPrompt);
    return builtPrompt;
  }
}
