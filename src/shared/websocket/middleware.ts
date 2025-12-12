/**
 * WebSocket middleware for authentication and rate limiting.
 */

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { SocketData, ServerToClientEvents, ClientToServerEvents, InterServerEvents } from './types';
import { Logger } from 'pino';

// Module-level logger reference
let socketLogger: Logger | null = null;

/**
 * Set the logger for WebSocket middleware
 */
export function setSocketLogger(logger: Logger): void {
  socketLogger = logger;
}

/**
 * JWT payload structure
 */
interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Extended socket type with data
 */
export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Authentication middleware for Socket.io
 * Verifies JWT from handshake auth or query parameter
 */
export function authMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
  try {
    // Get token from auth object or query parameter
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    // Initialize socket data
    socket.data.authenticated = false;
    socket.data.connectedAt = new Date();
    socket.data.rooms = new Set();

    if (!token || typeof token !== 'string') {
      // Allow unauthenticated connections but mark them
      socketLogger?.debug({ socketId: socket.id }, 'Socket connected without authentication');
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Attach user data to socket
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;
    socket.data.authenticated = true;

    socketLogger?.debug(
      { socketId: socket.id, userId: decoded.userId },
      'Socket authenticated successfully',
    );

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      socketLogger?.debug({ socketId: socket.id }, 'Socket token expired');
      socket.data.authenticated = false;
      // Allow connection but not authenticated
      return next();
    }

    if (error instanceof jwt.JsonWebTokenError) {
      socketLogger?.debug({ socketId: socket.id, error }, 'Invalid socket token');
      socket.data.authenticated = false;
      return next();
    }

    socketLogger?.error({ socketId: socket.id, error }, 'Socket auth middleware error');
    next(new Error('Authentication failed'));
  }
}

/**
 * Rate limiting state for sockets
 */
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  maxEvents: 100,
  windowMs: 60000, // 1 minute
};

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of socketRateLimits) {
    if (value.resetAt < now) {
      socketRateLimits.delete(key);
    }
  }
}, 60000);

/**
 * Rate limiting middleware for socket events
 * Call this before processing events
 */
export function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const limit = socketRateLimits.get(socketId);

  if (!limit || limit.resetAt < now) {
    // Create new rate limit window
    socketRateLimits.set(socketId, {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.windowMs,
    });
    return true;
  }

  if (limit.count >= RATE_LIMIT_CONFIG.maxEvents) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Wrap event handler with rate limiting
 */
export function withRateLimit<T extends unknown[], R>(
  socket: Socket,
  handler: (...args: T) => R,
): (...args: T) => R | void {
  return (...args: T) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', {
        code: 'RATE_LIMITED',
        message: 'Too many events. Please slow down.',
      });
      return;
    }
    return handler(...args);
  };
}

/**
 * Remove rate limit entry when socket disconnects
 */
export function clearRateLimit(socketId: string): void {
  socketRateLimits.delete(socketId);
}
