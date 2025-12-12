/**
 * Auth plugin routes.
 */

import { Router } from 'express';
import { asyncHandler } from '../../common/middleware';
import { authRateLimiter } from '../../common/middleware/rate-limiter';
import { registerHandler, loginHandler, getMeHandler } from './controller';
import { authMiddleware } from './middleware';

/**
 * Setup auth routes on the provided router.
 */
export function setupRoutes(router: Router): void {
  // Register new user
  // POST /api/v1/auth/register
  router.post('/register', authRateLimiter, asyncHandler(registerHandler));

  // Login user
  // POST /api/v1/auth/login
  router.post('/login', authRateLimiter, asyncHandler(loginHandler));

  // Get current user (protected)
  // GET /api/v1/auth/me
  router.get('/me', authMiddleware, asyncHandler(getMeHandler));
}

