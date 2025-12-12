import { env, Env } from './env';

// Re-export env for direct access if needed
export { env };
export type { Env };

/**
 * Centralized configuration object.
 * Provides typed access to all configuration values.
 */
export const config = {
  // Server
  port: env.PORT,
  host: env.HOST,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',

  // Database
  databaseUrl: env.DATABASE_URL,

  // Redis
  redisUrl: env.REDIS_URL,

  // Kafka
  kafka: {
    brokers: env.KAFKA_BROKERS.split(','),
    clientId: env.KAFKA_CLIENT_ID,
    enabled: env.KAFKA_ENABLED,
  },

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    cookieName: env.JWT_COOKIE_NAME,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },

  // Request
  requestTimeoutMs: env.REQUEST_TIMEOUT_MS,

  // Logging
  logLevel: env.LOG_LEVEL,
  logFormat: env.LOG_FORMAT,
} as const;

export type Config = typeof config;

// Re-export constants
export * from './constants';

