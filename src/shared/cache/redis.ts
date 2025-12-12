/**
 * Redis client singleton.
 * Provides a shared Redis connection for caching and rate limiting.
 */

import Redis from 'ioredis';
import { config } from '../../config';

// Logger will be injected to avoid circular dependencies
type Logger = {
  info: (msg: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
};

let logger: Logger | null = null;

/**
 * Set the logger instance for Redis logging.
 */
export function setRedisLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

/**
 * Create Redis client with error handling.
 */
function createRedisClient(): Redis {
  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  client.on('connect', () => {
    logger?.info('Redis connected');
  });

  client.on('error', (err) => {
    logger?.error({ err }, 'Redis error');
  });

  client.on('close', () => {
    logger?.warn({}, 'Redis connection closed');
  });

  return client;
}

/**
 * Singleton Redis client instance.
 */
export const redis: Redis = createRedisClient();

/**
 * Connect to Redis.
 * Should be called during application startup.
 */
export async function connectRedis(): Promise<void> {
  if (redis.status === 'ready') {
    return;
  }
  await redis.connect();
}

/**
 * Disconnect from Redis.
 * Should be called during application shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redis.status === 'end') {
    return;
  }
  await redis.quit();
}

/**
 * Health check for Redis connection.
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

