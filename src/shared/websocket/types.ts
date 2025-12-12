/**
 * WebSocket event type definitions.
 * Provides type-safe socket events for client-server communication.
 */

/**
 * Events emitted from server to clients
 */
export interface ServerToClientEvents {
  // Auth events
  'auth:user-logged-in': (data: { userId: string; email: string }) => void;
  'auth:user-logged-out': (data: { userId: string }) => void;
  'auth:user-created': (data: { userId: string; email: string }) => void;

  // System events
  'system:notification': (data: { type: 'info' | 'warning' | 'error'; message: string }) => void;
  'system:maintenance': (data: { startsAt: string; message: string }) => void;

  // Plugin events
  'plugin:enabled': (data: { name: string }) => void;
  'plugin:disabled': (data: { name: string }) => void;

  // Generic broadcast
  broadcast: (data: { channel: string; payload: unknown }) => void;

  // Error events
  error: (data: { code: string; message: string }) => void;
}

/**
 * Events emitted from clients to server
 */
export interface ClientToServerEvents {
  // Room management
  'join-room': (
    roomId: string,
    callback: (response: { success: boolean; error?: string }) => void,
  ) => void;
  'leave-room': (roomId: string, callback: (response: { success: boolean }) => void) => void;

  // Ping for connection health
  ping: (callback: (response: { pong: true; timestamp: number }) => void) => void;

  // Subscribe to specific channels
  subscribe: (
    channel: string,
    callback: (response: { success: boolean; error?: string }) => void,
  ) => void;
  unsubscribe: (channel: string, callback: (response: { success: boolean }) => void) => void;
}

/**
 * Inter-server events (for scaling with Redis adapter)
 */
export interface InterServerEvents {
  // Add inter-server events here if using Redis adapter
}

/**
 * Socket data attached to each connection
 */
export interface SocketData {
  userId?: string;
  email?: string;
  authenticated: boolean;
  connectedAt: Date;
  rooms: Set<string>;
}

/**
 * Room types for socket subscriptions
 */
export type RoomType = 'user' | 'channel' | 'broadcast';

/**
 * Helper to create a user-specific room name
 */
export function getUserRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Helper to create a channel room name
 */
export function getChannelRoom(channelName: string): string {
  return `channel:${channelName}`;
}

/**
 * Socket connection info for logging
 */
export interface SocketConnectionInfo {
  socketId: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  connectedAt: Date;
}
