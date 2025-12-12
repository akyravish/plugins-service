/**
 * Auth plugin request handlers.
 */

import { Request, Response } from 'express';
import { AuthService } from './service';
import { registerSchema, loginSchema } from './validators';
import { sendSuccess, sendCreated } from '../../common/responses';
import { pluginEvents } from '../../shared/events';
import { prisma } from '../../shared/db/prisma';
import { publishUserCreated, publishUserLoggedIn, publishFailedLogin } from './events';
import { broadcastUserCreated, broadcastUserLoggedIn } from './socket';
import { InvalidCredentialsError } from '../../common/errors';

// Create auth service instance
const authService = new AuthService(prisma);

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export async function registerHandler(req: Request, res: Response): Promise<Response> {
  // Validate request body
  const input = registerSchema.parse(req.body);

  // Register user
  const result = await authService.register(input);

  // Emit user created event (in-process)
  pluginEvents.emitEvent('auth:user-created', {
    userId: result.user.id,
    email: result.user.email,
  });

  // Broadcast via WebSocket (real-time)
  broadcastUserCreated(result.user.id, result.user.email);

  // Publish to Kafka (async, fire-and-forget)
  publishUserCreated(result.user.id, result.user.email).catch(() => {
    // Silently fail - Kafka publishing is best-effort
  });

  return sendCreated(res, result, 'User registered successfully');
}

/**
 * Login a user
 * POST /api/v1/auth/login
 */
export async function loginHandler(req: Request, res: Response): Promise<Response> {
  // Validate request body
  const input = loginSchema.parse(req.body);

  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.get('user-agent');

  try {
    // Login user
    const result = await authService.login(input);

    // Emit user logged in event (in-process)
    pluginEvents.emitEvent('auth:user-logged-in', {
      userId: result.user.id,
      email: result.user.email,
    });

    // Broadcast via WebSocket (real-time to user's other sessions)
    broadcastUserLoggedIn(result.user.id, result.user.email);

    // Publish to Kafka (async, fire-and-forget)
    publishUserLoggedIn(result.user.id, result.user.email, ip, userAgent).catch(() => {
      // Silently fail - Kafka publishing is best-effort
    });

    return sendSuccess(res, result, 200, 'Login successful');
  } catch (error) {
    // Publish failed login to Kafka
    if (error instanceof InvalidCredentialsError) {
      publishFailedLogin(input.email, ip, userAgent).catch(() => {
        // Silently fail
      });
    }
    throw error;
  }
}

/**
 * Get current user (requires authentication)
 * GET /api/v1/auth/me
 */
export async function getMeHandler(req: Request, res: Response): Promise<Response> {
  // User is attached by authMiddleware
  const { userId } = req.user!;

  // Get full user data
  const user = await authService.getUserById(userId);

  return sendSuccess(res, { user }, 200);
}
