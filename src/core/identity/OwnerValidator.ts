import { SYSTEM_CONSTANTS } from '../../config/constants';
import { UserIdentity } from '../../types/persona.types';

/**
 * Validates owner status through immutable ID comparison.
 * This is the ONLY source of truth for owner identification.
 * 
 * SECURITY: Owner status cannot be spoofed through:
 * - Discord roles
 * - Nicknames
 * - Server permissions
 * - Admin privileges
 * - Commands or configuration
 */
export class OwnerValidator {
  private readonly ownerId: string;

  constructor() {
    // Store owner ID as private immutable field
    this.ownerId = SYSTEM_CONSTANTS.OWNER_ID;
  }

  /**
   * Perform exact ID comparison to determine ownership.
   * This is the ONLY method that determines owner status.
   * 
   * @param identity - User identity to validate
   * @returns True if and only if user ID exactly matches OWNER_ID
   */
  public isOwner(identity: UserIdentity): boolean {
    // Exact string comparison - no fuzzy matching, no exceptions
    return identity.id === this.ownerId;
  }

  /**
   * Get owner ID for logging purposes only.
   * Should never be used for comparison outside this class.
   * 
   * @returns Owner ID constant
   */
  public getOwnerId(): string {
    return this.ownerId;
  }
}
