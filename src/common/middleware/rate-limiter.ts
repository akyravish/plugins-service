/**
 * Rate limiting middleware.
 * Uses Redis for distributed rate limiting.
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { config } from '../../config';

/**
 * Default global rate limiter.
 * Uses in-memory store by default, can be upgraded to Redis store.
 */
export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: () => config.isTest, // Skip rate limiting in tests
});

/**
 * Create a custom rate limiter with specific limits.
 * Use this for routes that need different rate limits.
 *
 * @example
 * const loginLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
 * router.post('/login', loginLimiter, loginController);
 */
export function createRateLimiter(
  windowMs: number,
  max: number,
  message?: string,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: message || 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    skip: () => config.isTest,
  });
}

/**
 * Strict rate limiter for sensitive operations.
 * 5 requests per 15 minutes.
 */
export const strictRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests
  'Too many attempts, please try again in 15 minutes',
);

/**
 * Auth rate limiter for login/register.
 * 10 requests per 15 minutes.
 */
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests
  'Too many authentication attempts, please try again later',
);

