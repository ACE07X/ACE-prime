/**
 * Immutable system constants.
 * These values MUST NOT be modified at runtime.
 */
export const SYSTEM_CONSTANTS = Object.freeze({
  /**
   * Owner identity - absolute authority in the system.
   * This ID cannot be overridden by roles, permissions, or commands.
   */
  OWNER_ID: '618512174620475394' as const,
  OWNER_NAME: 'ACE' as const,
  
  /**
   * System version and metadata
   */
  BOT_NAME: 'ACE Prime' as const,
  VERSION: '1.0.0' as const,
});

// Type-safe access
export type SystemConstants = typeof SYSTEM_CONSTANTS;
