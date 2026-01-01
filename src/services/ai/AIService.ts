import { BuiltPrompt } from '../../core/prompts/PromptBuilder';

/**
 * Response from AI service after generating a completion.
 */
export interface AIResponse {
  /**
   * Raw text output from the AI model.
   */
  text: string;

  /**
   * Model name used for generation.
   */
  model: string;

  /**
   * Token usage information (if available).
   */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Interface for AI service implementations.
 * 
 * This interface allows for swapping between different AI providers
 * (OpenAI, Anthropic, local LLM, etc.) without changing pipeline code.
 * 
 * Responsibilities:
 * - Accept fully-built prompts from PromptBuilder
 * - Execute API calls to AI service
 * - Return structured response with text, model, and token usage
 * 
 * NOT Responsible For:
 * - Building prompts (PromptBuilder's job)
 * - Selecting persona (PersonaSelector's job)
 * - Managing context (ContextManager's job)
 * - Formatting responses for Discord (ResponseFormatter's job)
 */
export interface AIService {
  /**
   * Generate a response from the AI service using a fully-built prompt.
   * 
   * @param prompt - Complete prompt payload from PromptBuilder
   * @returns AI response with text, model name, and token usage
   * @throws Error if API call fails or prompt is invalid
   */
  generateResponse(prompt: BuiltPrompt): Promise<AIResponse>;
}

