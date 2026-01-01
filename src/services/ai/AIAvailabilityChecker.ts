/**
 * Helper to check if OpenAI API is available.
 * 
 * This is a runtime guard that checks if the OpenAI API key
 * is configured without attempting to initialize the client.
 * 
 * Used by MessageHandler to determine if AI responses are available.
 */
export class AIAvailabilityChecker {
  /**
   * Check if OpenAI API key is configured.
   * 
   * Uses bracket notation for safe environment variable access.
   * Works with both .env files (local) and Railway environment variables.
   * 
   * @returns True if API key is present and non-empty, false otherwise
   */
  static isOpenAIAvailable(): boolean {
    // Use bracket notation for safe access
    const apiKey = process.env['OPENAI_API_KEY'];
    return !!(apiKey && apiKey.trim().length > 0);
  }
}

