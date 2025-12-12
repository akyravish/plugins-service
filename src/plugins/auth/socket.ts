/**
 * Auth plugin WebSocket handlers.
 * Broadcasts auth events to connected clients in real-time.
 */

import { Logger } from 'pino';
import { TypedSocketServer } from '../../core/types';
import { emitToUser } from '../../shared/websocket';

// Module-level logger reference
let socketLogger: Logger | null = null;

/**
 * Set the logger for auth socket handlers
 */
export function setAuthSocketLogger(logger: Logger): void {
  socketLogger = logger;
}

/**
 * Setup auth-related socket handlers
 * Called when the auth plugin is enabled
 */
export function setupAuthSocketHandlers(io: TypedSocketServer | null): void {
  if (!io) {
    socketLogger?.debug('WebSocket not available, skipping auth socket handlers setup');
    return;
  }

  socketLogger?.info('Auth socket handlers initialized');

  // Socket.io namespaces or rooms can be set up here if needed
  // For now, the auth plugin uses the helper functions to broadcast events
}

/**
 * Broadcast user login event to the user's devices
 */
export function broadcastUserLoggedIn(userId: string, email: string): void {
  emitToUser(userId, 'auth:user-logged-in', { userId, email });
  socketLogger?.debug({ userId }, 'Broadcasted user-logged-in event');
}

/**
 * Broadcast user logout event to the user's devices
 */
export function broadcastUserLoggedOut(userId: string): void {
  emitToUser(userId, 'auth:user-logged-out', { userId });
  socketLogger?.debug({ userId }, 'Broadcasted user-logged-out event');
}

/**
 * Broadcast new user created event (for admin dashboards, etc.)
 */
export function broadcastUserCreated(userId: string, email: string): void {
  // Emit to a channel that admins can subscribe to
  emitToUser(userId, 'auth:user-created', { userId, email });
  socketLogger?.debug({ userId, email }, 'Broadcasted user-created event');
}

/**
 * Cleanup auth socket handlers
 * Called when the auth plugin is disabled
 */
export function cleanupAuthSocketHandlers(): void {
  socketLogger?.info('Auth socket handlers cleaned up');
}
