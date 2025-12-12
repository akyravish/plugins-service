/**
 * Auth plugin specific constants.
 */

export const AUTH_CONSTANTS = {
  // Token settings
  TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY: '30d',

  // Password settings
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  BCRYPT_ROUNDS: 12,

  // Rate limiting for auth endpoints
  LOGIN_RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
  },
  REGISTER_RATE_LIMIT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 registrations
  },

  // Event names
  EVENTS: {
    USER_CREATED: 'auth:user-created',
    USER_LOGGED_IN: 'auth:user-logged-in',
    USER_LOGGED_OUT: 'auth:user-logged-out',
    PASSWORD_CHANGED: 'auth:password-changed',
  },
} as const;

