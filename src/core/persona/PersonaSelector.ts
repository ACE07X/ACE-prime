import { Message } from 'discord.js';
import { IdentityResolver } from '../identity/IdentityResolver';
import { OwnerValidator } from '../identity/OwnerValidator';
import { PersonaLogger } from './PersonaLogger';
import { PersonaType, PersonaSelection } from '../../types/persona.types';

/**
 * CRITICAL PIPELINE STAGE
 * 
 * Selects persona (Butler or Supervisor) based on user identity.
 * This MUST happen before prompt construction in the pipeline.
 * 
 * Selection Rules:
 * - Owner ID match → BUTLER persona
 * - Any other user → SUPERVISOR persona
 * - No exceptions, no overrides
 * 
 * Security:
 * - All selections are logged for audit
 * - Persona cannot be spoofed or toggled
 * - Decision is immutable once made
 */
export class PersonaSelector {
  private readonly identityResolver: IdentityResolver;
  private readonly ownerValidator: OwnerValidator;
  private readonly logger: PersonaLogger;

  constructor(
    identityResolver: IdentityResolver,
    ownerValidator: OwnerValidator,
    logger: PersonaLogger
  ) {
    this.identityResolver = identityResolver;
    this.ownerValidator = ownerValidator;
    this.logger = logger;
  }

  /**
   * Select appropriate persona for a Discord message.
   * 
   * Pipeline Position: MUST execute after Identity Resolver,
   * BEFORE Context Manager and Prompt Builder.
   * 
   * @param message - Discord message to process
   * @returns Immutable persona selection with audit data
   * @throws Error if identity resolution fails
   */
  public selectPersona(message: Message): PersonaSelection {
    try {
      // Step 1: Resolve user identity
      const identity = this.identityResolver.resolveIdentity(message);

      // Step 2: Validate user is not a bot
      if (!this.identityResolver.isValidUser(identity)) {
        throw new Error('Cannot select persona for bot user');
      }

      // Step 3: Check owner status (IMMUTABLE)
      const isOwner = this.ownerValidator.isOwner(identity);

      // Step 4: Select persona based on ownership
      const persona = isOwner ? PersonaType.BUTLER : PersonaType.SUPERVISOR;

      // Step 5: Create immutable selection result
      const selection: PersonaSelection = Object.freeze({
        persona,
        userId: identity.id,
        username: identity.username,
        isOwner,
        timestamp: new Date(),
        messageId: message.id,
        channelId: message.channelId,
      });

      // Step 6: Audit log the decision
      this.logger.logSelection(selection);

      return selection;
    } catch (error) {
      // Log error and re-throw
      this.logger.logError(
        error as Error,
        message.author.id,
        message.id
      );
      throw error;
    }
  }

  /**
   * Get persona type without full selection (for testing/debugging).
   * Still performs full validation.
   * 
   * @param message - Discord message
   * @returns Persona type that would be selected
   */
  public getPersonaType(message: Message): PersonaType {
    const identity = this.identityResolver.resolveIdentity(message);
    const isOwner = this.ownerValidator.isOwner(identity);
    return isOwner ? PersonaType.BUTLER : PersonaType.SUPERVISOR;
  }
}
