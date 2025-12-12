/**
 * Application-wide constants.
 * These are static values that don't change based on environment.
 */

export const APP_CONSTANTS = {
  // API Configuration
  API_VERSION: 'v1',
  API_PREFIX: '/api',

  // Payload Limits
  MAX_PAYLOAD_SIZE: '10kb',
  MAX_URL_ENCODED_SIZE: '10kb',

  // Pagination Defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,

  // Security
  BCRYPT_SALT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,

  // Request
  REQUEST_ID_HEADER: 'X-Request-ID',

  // Cookie Settings
  COOKIE_SAME_SITE: 'lax' as const,

  // Plugin Configuration
  PLUGINS_DIR: 'plugins',
  PLUGIN_CONFIG_FILE: 'plugin.json',
} as const;

/**
 * HTTP Status codes for common responses.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Sensitive fields that should never be logged.
 */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'cvv',
  'ssn',
  'apiKey',
  'accessToken',
  'refreshToken',
] as const;

