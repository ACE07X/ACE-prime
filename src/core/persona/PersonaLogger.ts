import { PersonaSelection } from '../../types/persona.types';
import { Logger } from '../../utils/logger';

/**
 * Audit logger for all persona selection decisions.
 * Provides immutable audit trail for security and debugging.
 */
export class PersonaLogger {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Log a persona selection decision.
   * All persona selections MUST be logged for audit purposes.
   * 
   * @param selection - Persona selection result
   */
  public logSelection(selection: PersonaSelection): void {
    this.logger.info('Persona selected', {
      persona: selection.persona,
      userId: selection.userId,
      username: selection.username,
      isOwner: selection.isOwner,
      messageId: selection.messageId,
      channelId: selection.channelId,
      timestamp: selection.timestamp.toISOString(),
    });
  }

  /**
   * Log a persona selection error or anomaly.
   * 
   * @param error - Error that occurred during persona selection
   * @param userId - User ID involved
   * @param messageId - Message ID involved
   */
  public logError(error: Error, userId: string, messageId: string): void {
    this.logger.error('Persona selection error', {
      error: error.message,
      stack: error.stack,
      userId,
      messageId,
    });
  }
}
