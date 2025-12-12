/**
 * WebSocket server setup using Socket.io.
 * Provides real-time communication capabilities for plugins.
 */

import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { Logger } from 'pino';
import { config } from '../../config';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  getUserRoom,
  SocketConnectionInfo,
} from './types';
import {
  authMiddleware,
  setSocketLogger,
  clearRateLimit,
  withRateLimit,
  AuthenticatedSocket,
} from './middleware';

// Module-level logger reference
let logger: Logger | null = null;

// Socket.io server instance
let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null =
  null;

/**
 * Set the logger for WebSocket module
 */
export function setWebSocketLogger(wsLogger: Logger): void {
  logger = wsLogger;
  setSocketLogger(wsLogger);
}

/**
 * Get the Socket.io server instance
 */
export function getIO(): Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null {
  return io;
}

/**
 * Initialize WebSocket server
 */
export function initWebSocket(
  httpServer: HttpServer,
): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  if (io) {
    logger?.warn('WebSocket server already initialized');
    return io;
  }

  // Parse CORS origins
  const corsOrigins =
    config.websocket.corsOrigin === '*'
      ? true
      : config.websocket.corsOrigin.split(',').map((o) => o.trim());

  // Create Socket.io server
  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: corsOrigins,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
    },
  );

  // Apply authentication middleware
  io.use(authMiddleware);

  // Handle connections
  io.on('connection', (socket: AuthenticatedSocket) => {
    const connectionInfo: SocketConnectionInfo = {
      socketId: socket.id,
      userId: socket.data.userId,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      connectedAt: socket.data.connectedAt,
    };

    logger?.info(connectionInfo, 'Socket connected');

    // If authenticated, join user-specific room
    if (socket.data.authenticated && socket.data.userId) {
      const userRoom = getUserRoom(socket.data.userId);
      socket.join(userRoom);
      socket.data.rooms.add(userRoom);
      logger?.debug({ socketId: socket.id, room: userRoom }, 'Socket joined user room');
    }

    // Handle ping
    socket.on(
      'ping',
      withRateLimit(socket, (callback) => {
        callback({ pong: true, timestamp: Date.now() });
      }),
    );

    // Handle room joining
    socket.on(
      'join-room',
      withRateLimit(socket, (roomId, callback) => {
        if (!socket.data.authenticated) {
          callback({ success: false, error: 'Authentication required' });
          return;
        }

        // Validate room name
        if (!roomId || typeof roomId !== 'string' || roomId.length > 100) {
          callback({ success: false, error: 'Invalid room ID' });
          return;
        }

        socket.join(roomId);
        socket.data.rooms.add(roomId);
        logger?.debug({ socketId: socket.id, room: roomId }, 'Socket joined room');
        callback({ success: true });
      }),
    );

    // Handle room leaving
    socket.on(
      'leave-room',
      withRateLimit(socket, (roomId, callback) => {
        socket.leave(roomId);
        socket.data.rooms.delete(roomId);
        logger?.debug({ socketId: socket.id, room: roomId }, 'Socket left room');
        callback({ success: true });
      }),
    );

    // Handle channel subscription
    socket.on(
      'subscribe',
      withRateLimit(socket, (channel, callback) => {
        if (!socket.data.authenticated) {
          callback({ success: false, error: 'Authentication required' });
          return;
        }

        const channelRoom = `channel:${channel}`;
        socket.join(channelRoom);
        socket.data.rooms.add(channelRoom);
        logger?.debug({ socketId: socket.id, channel }, 'Socket subscribed to channel');
        callback({ success: true });
      }),
    );

    // Handle channel unsubscription
    socket.on(
      'unsubscribe',
      withRateLimit(socket, (channel, callback) => {
        const channelRoom = `channel:${channel}`;
        socket.leave(channelRoom);
        socket.data.rooms.delete(channelRoom);
        logger?.debug({ socketId: socket.id, channel }, 'Socket unsubscribed from channel');
        callback({ success: true });
      }),
    );

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      clearRateLimit(socket.id);
      logger?.info(
        { socketId: socket.id, userId: socket.data.userId, reason },
        'Socket disconnected',
      );
    });

    // Handle errors
    socket.on('error', (error) => {
      logger?.error({ socketId: socket.id, error }, 'Socket error');
    });
  });

  logger?.info('WebSocket server initialized');
  return io;
}

/**
 * Disconnect WebSocket server
 */
export async function disconnectWebSocket(): Promise<void> {
  if (!io) {
    return;
  }

  return new Promise((resolve) => {
    io!.close(() => {
      logger?.info('WebSocket server closed');
      io = null;
      resolve();
    });
  });
}

/**
 * Emit event to a specific user
 */
export function emitToUser<E extends keyof ServerToClientEvents>(
  userId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  if (!io) {
    logger?.warn('WebSocket server not initialized, cannot emit to user');
    return;
  }

  const userRoom = getUserRoom(userId);
  io.to(userRoom).emit(event, ...args);
}

/**
 * Emit event to a channel
 */
export function emitToChannel<E extends keyof ServerToClientEvents>(
  channel: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  if (!io) {
    logger?.warn('WebSocket server not initialized, cannot emit to channel');
    return;
  }

  const channelRoom = `channel:${channel}`;
  io.to(channelRoom).emit(event, ...args);
}

/**
 * Broadcast event to all connected clients
 */
export function broadcast<E extends keyof ServerToClientEvents>(
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  if (!io) {
    logger?.warn('WebSocket server not initialized, cannot broadcast');
    return;
  }

  io.emit(event, ...args);
}

/**
 * Get connected socket count
 */
export async function getConnectedCount(): Promise<number> {
  if (!io) {
    return 0;
  }

  const sockets = await io.fetchSockets();
  return sockets.length;
}

/**
 * Get authenticated socket count
 */
export async function getAuthenticatedCount(): Promise<number> {
  if (!io) {
    return 0;
  }

  const sockets = await io.fetchSockets();
  return sockets.filter((s) => s.data.authenticated).length;
}

/**
 * Check if WebSocket is initialized
 */
export function isWebSocketInitialized(): boolean {
  return io !== null;
}

// Re-export types and helpers
export * from './types';
export { setSocketLogger, AuthenticatedSocket } from './middleware';
