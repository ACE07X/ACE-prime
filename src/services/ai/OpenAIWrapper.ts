import OpenAI from 'openai';
import { AIService, AIResponse } from './AIService';
import { BuiltPrompt } from '../../core/prompts/PromptBuilder';

/**
 * OpenAI API wrapper implementation.
 * 
 * Thin execution layer that:
 * - Reads API key from environment
 * - Accepts fully-built prompts from PromptBuilder
 * - Calls OpenAI Chat Completions API
 * - Returns structured response
 * 
 * Design Principles:
 * - No prompt building logic
 * - No persona logic
 * - No side effects beyond API call
 * - Replaceable with other AI providers
 * 
 * Environment Requirements:
 * - OPENAI_API_KEY: OpenAI API key (required)
 * - OPENAI_MODEL: Model to use (optional, defaults to 'gpt-4')
 */
export class OpenAIWrapper implements AIService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        'OPENAI_API_KEY environment variable is required but not set. ' +
        'Please set OPENAI_API_KEY in your .env file or environment.'
      );
    }

    this.client = new OpenAI({
      apiKey,
    });

    // Default to gpt-4 if not specified
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Generate response from OpenAI using built prompt.
   * 
   * @param prompt - Fully-built prompt from PromptBuilder
   * @returns AI response with text, model name, and token usage
   * @throws Error if API call fails
   */
  async generateResponse(prompt: BuiltPrompt): Promise<AIResponse> {
    try {
      // Convert BuiltPrompt messages to OpenAI format
      // BuiltPrompt.messages is already in OpenAI-compatible format
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: prompt.messages,
        temperature: 0.7, // Default temperature, can be made configurable later
      });

      // Extract response text
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('OpenAI API returned empty response content');
      }

      // Extract token usage if available
      const usage = response.usage;

      return {
        text: content,
        model: response.model,
        tokenUsage: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      // Minimal error handling - just rethrow with context
      if (error instanceof Error) {
        throw new Error(
          `OpenAI API call failed: ${error.message}`,
          { cause: error }
        );
      }
      throw new Error(
        `OpenAI API call failed: ${String(error)}`,
        { cause: error }
      );
    }
  }
}

