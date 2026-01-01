/**
 * Type definitions for the prompt loading system.
 */

/**
 * Represents a loaded prompt with metadata.
 */
export interface LoadedPrompt {
  /**
   * The prompt text content.
   */
  content: string;

  /**
   * Type/name of the prompt.
   */
  type: string;

  /**
   * When the prompt was loaded.
   */
  loadedAt: Date;

  /**
   * Size of the prompt in characters.
   */
  size: number;
}
