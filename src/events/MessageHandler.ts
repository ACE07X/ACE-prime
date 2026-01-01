import { Message } from 'discord.js';
import { IdentityResolver } from '../core/identity/IdentityResolver';
import { OwnerValidator } from '../core/identity/OwnerValidator';
import { PersonaSelector } from '../core/persona/PersonaSelector';
import { PersonaLogger } from '../core/persona/PersonaLogger';
import { AIAvailabilityChecker } from '../services/ai/AIAvailabilityChecker';
import { Logger } from '../utils/logger';

/**
 * Fallback message sent when OpenAI API is not available.
 * Exact text as specified in requirements.
 */
const FALLBACK_MESSAGE = 'ACE Prime is online. AI responses are currently disabled.';

/**
 * Discord message handler for ACE Prime.
 * 
 * Responsibilities:
 * - Handle incoming Discord messages
 * - Execute persona selection (Butler/Supervisor)
 * - Check OpenAI availability
 * - Send appropriate response (fallback or AI-generated)
 * 
 * Runtime Guard Behavior:
 * - If OPENAI_API_KEY is missing: sends fallback message, no crash
 * - Persona selection still executes and logs
 * - Pipeline stages still run (up to persona selection)
 * - No prompts sent to AI when key is missing
 * 
 * NOT Responsible For:
 * - Building prompts (PromptBuilder's job)
 * - Calling OpenAI (OpenAIWrapper's job)
 * - Pipeline orchestration (Pipeline's job)
 */
export class MessageHandler {
  private readonly personaSelector: PersonaSelector;
  private readonly logger: Logger;
  private readonly isOpenAIAvailable: boolean;

  constructor(logger: Logger) {
    this.logger = logger;
    
    // Initialize persona selection components
    const identityResolver = new IdentityResolver();
    const ownerValidator = new OwnerValidator();
    const personaLogger = new PersonaLogger(logger);
    this.personaSelector = new PersonaSelector(
      identityResolver,
      ownerValidator,
      personaLogger
    );

    // Check OpenAI availability at construction time
    this.isOpenAIAvailable = AIAvailabilityChecker.isOpenAIAvailable();
    
    if (!this.isOpenAIAvailable) {
      this.logger.warn('OpenAI API key not configured. Bot will run in fallback mode.', {
        message: 'Set OPENAI_API_KEY environment variable to enable AI responses',
      });
    } else {
      this.logger.info('OpenAI API key detected. AI responses enabled.');
    }
  }

  /**
   * Handle an incoming Discord message.
   * 
   * Flow:
   * 1. Ignore bot messages
   * 2. Execute persona selection (mandatory, always runs)
   * 3. Check OpenAI availability
   * 4. Send fallback message if OpenAI unavailable
   * 5. (Future) Continue with AI pipeline if available
   * 
   * @param message - Discord message to handle
   */
  async handleMessage(message: Message): Promise<void> {
    try {
      // Ignore bot messages
      if (message.author.bot) {
        return;
      }

      this.logger.debug('Processing message', {
        messageId: message.id,
        userId: message.author.id,
        channelId: message.channelId,
      });

      // CRITICAL: Persona selection MUST run regardless of OpenAI availability
      // This ensures audit logging and persona logic always executes
      let personaSelection;
      try {
        personaSelection = this.personaSelector.selectPersona(message);
        this.logger.debug('Persona selection completed', {
          persona: personaSelection.persona,
          isOwner: personaSelection.isOwner,
        });
      } catch (error) {
        this.logger.error('Persona selection failed', {
          error: (error as Error).message,
          messageId: message.id,
        });
        // Don't crash - just log and return
        return;
      }

      // Runtime guard: Check OpenAI availability
      if (!this.isOpenAIAvailable) {
        // Send fallback message without calling OpenAI
        await this.sendFallbackResponse(message);
        return;
      }

      // OpenAI is available - continue with normal flow
      // (Future: This is where AI pipeline would continue)
      this.logger.debug('OpenAI available, but AI pipeline not yet implemented', {
        messageId: message.id,
      });

    } catch (error) {
      // Catch-all error handler to prevent crashes
      this.logger.error('Message handling failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        messageId: message.id,
      });
      // Don't rethrow - bot should continue running
    }
  }

  /**
   * Send fallback response when OpenAI is unavailable.
   * 
   * @param message - Original Discord message
   */
  private async sendFallbackResponse(message: Message): Promise<void> {
    try {
      await message.reply(FALLBACK_MESSAGE);
      this.logger.debug('Fallback message sent', {
        messageId: message.id,
        channelId: message.channelId,
      });
    } catch (error) {
      this.logger.error('Failed to send fallback message', {
        error: (error as Error).message,
        messageId: message.id,
      });
      // Don't throw - just log the error
    }
  }
}

