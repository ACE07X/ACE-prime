/**
 * Stateless validation utility for prompt text.
 * Ensures loaded prompts meet basic quality and security requirements.
 */
export class PromptValidator {
  /**
   * Forbidden patterns in prompt text.
   * These indicate potential template injection or invalid formatting.
   */
  private static readonly FORBIDDEN_PATTERNS = [
    /\$\{[^}]*\}/g,  // Template literals like ${variable}
    /\{\{[^}]*\}\}/g, // Handlebars-style {{variable}}
  ];

  /**
   * Validate that prompt text is usable.
   * 
   * @param promptText - Text to validate
   * @param promptName - Name of prompt (for error messages)
   * @throws Error if validation fails
   */
  public static validate(promptText: unknown, promptName: string): void {
    // Check 1: Must be a string
    if (typeof promptText !== 'string') {
      throw new Error(
        `Prompt '${promptName}' validation failed: Expected string, got ${typeof promptText}`
      );
    }

    // Check 2: Must not be empty or whitespace-only
    const trimmed = promptText.trim();
    if (trimmed.length === 0) {
      throw new Error(
        `Prompt '${promptName}' validation failed: Prompt text is empty or whitespace-only`
      );
    }

    // Check 3: Must not contain forbidden placeholders
    for (const pattern of PromptValidator.FORBIDDEN_PATTERNS) {
      if (pattern.test(promptText)) {
        throw new Error(
          `Prompt '${promptName}' validation failed: Contains forbidden pattern ${pattern.source}. ` +
          `Prompts should be static text without template placeholders.`
        );
      }
    }
  }

  /**
   * Validate that prompt text meets minimum length requirement.
   * 
   * @param promptText - Text to validate
   * @param promptName - Name of prompt (for error messages)
   * @param minLength - Minimum required length
   * @throws Error if too short
   */
  public static validateMinLength(
    promptText: string,
    promptName: string,
    minLength: number
  ): void {
    const trimmed = promptText.trim();
    if (trimmed.length < minLength) {
      throw new Error(
        `Prompt '${promptName}' validation failed: ` +
        `Length ${trimmed.length} is less than minimum ${minLength} characters`
      );
    }
  }

  /**
   * Validate that prompt text does not exceed maximum length.
   * 
   * @param promptText - Text to validate
   * @param promptName - Name of prompt (for error messages)
   * @param maxLength - Maximum allowed length
   * @throws Error if too long
   */
  public static validateMaxLength(
    promptText: string,
    promptName: string,
    maxLength: number
  ): void {
    if (promptText.length > maxLength) {
      throw new Error(
        `Prompt '${promptName}' validation failed: ` +
        `Length ${promptText.length} exceeds maximum ${maxLength} characters`
      );
    }
  }
}
