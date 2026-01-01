/**
 * Persona types for ACE Prime dual-persona system.
 */
export enum PersonaType {
  /**
   * Butler Mode - Used exclusively for the owner.
   * Loyal, discreet, execution-focused, assumes authority.
   */
  BUTLER = 'BUTLER',
  
  /**
   * Supervisor Mode - Used for all non-owner users.
   * Professional, structured, instructional, authoritative.
   */
  SUPERVISOR = 'SUPERVISOR',
}

/**
 * Persona selection result with audit information.
 */
export interface PersonaSelection {
  persona: PersonaType;
  userId: string;
  username: string;
  isOwner: boolean;
  timestamp: Date;
  messageId: string;
  channelId: string;
}

/**
 * User identity extracted from Discord message.
 */
export interface UserIdentity {
  id: string;
  username: string;
  discriminator: string;
  displayName: string;
  isBot: boolean;
}
