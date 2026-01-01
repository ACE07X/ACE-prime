import { Message } from 'discord.js';
import { UserIdentity } from '../../types/persona.types';

/**
 * Resolves user identity from Discord messages.
 * Provides immutable identity objects for downstream processing.
 */
export class IdentityResolver {
  /**
   * Extract user identity from a Discord message.
   * 
   * @param message - Discord message object
   * @returns Immutable user identity
   */
  public resolveIdentity(message: Message): UserIdentity {
    const author = message.author;
    
    return Object.freeze({
      id: author.id,
      username: author.username,
      discriminator: author.discriminator,
      displayName: message.member?.displayName ?? author.username,
      isBot: author.bot,
    });
  }

  /**
   * Validate that the identity is from a real user (not a bot).
   * 
   * @param identity - User identity to validate
   * @returns True if valid human user
   */
  public isValidUser(identity: UserIdentity): boolean {
    return !identity.isBot && identity.id.length > 0;
  }
}
