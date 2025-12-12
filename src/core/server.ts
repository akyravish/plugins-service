/**
 * Server entry point.
 * Initializes the application and starts the HTTP server.
 */

import * as http from 'http';
import * as path from 'path';
import { createApp, registerErrorHandler } from './app';
import { createPluginLoader } from './plugin-loader';
import { lifecycleManager } from './lifecycle-manager';
import { config } from '../config';
import { connectDatabase, disconnectDatabase } from '../shared/db/prisma';
import { connectRedis, disconnectRedis, setRedisLogger } from '../shared/cache/redis';
import { initKafka, disconnectKafka, setKafkaLogger } from '../shared/messaging';
import { initWebSocket, disconnectWebSocket, setWebSocketLogger } from '../shared/websocket';
import { pluginEvents } from '../shared/events';
import logger from './logger';

/**
 * Initialize and start the server
 */
async function main(): Promise<void> {
  logger.info('Starting Plugin Arc server...');

  // Set logger for Redis
  setRedisLogger(logger);

  // Create Express app
  const app = createApp();

  // Connect to database
  try {
    await connectDatabase();
    logger.info('Database connected');
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database');
    process.exit(1);
  }

  // Connect to Redis
  try {
    await connectRedis();
    logger.info('Redis connected');
  } catch (error) {
    logger.warn({ error }, 'Failed to connect to Redis, continuing without cache');
  }

  // Initialize Kafka (if enabled)
  if (config.kafka.enabled) {
    setKafkaLogger(logger);
    try {
      await initKafka();
      logger.info('Kafka connected');
    } catch (error) {
      logger.warn({ error }, 'Failed to connect to Kafka, continuing without messaging');
    }
  }

  // Load plugins
  const pluginsDir = path.join(__dirname, '..', 'plugins');
  const pluginLoader = createPluginLoader(pluginsDir, true);

  try {
    const results = await pluginLoader.loadAllPlugins();
    const loaded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    logger.info({ loaded, failed }, 'Plugins loaded');

    // Register plugin routes
    pluginLoader.registerPluginRoutes(app);
  } catch (error) {
    logger.error({ error }, 'Error during plugin loading');
  }

  // Register global error handler (must be after routes)
  registerErrorHandler(app);

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket server (if enabled)
  if (config.websocket.enabled) {
    setWebSocketLogger(logger);
    initWebSocket(server);
    logger.info('WebSocket server initialized');
  }

  // Start HTTP server
  const { port, host } = config;
  server.listen(port, host, () => {
    logger.info({ host, port, websocket: config.websocket.enabled }, 'Server listening');
  });

  // Configure server timeouts
  server.timeout = config.requestTimeoutMs;
  server.keepAliveTimeout = 65000; // Slightly higher than ALB default (60s)
  server.headersTimeout = 66000;

  // Graceful shutdown handler
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');

    // Emit shutdown event
    pluginEvents.emitEvent('system:shutdown', { reason: signal });

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      // Unload all plugins (executes onDisable and onUnload hooks)
      await lifecycleManager.unloadAllPlugins();
      logger.info('All plugins unloaded');

      // Disconnect from services
      await Promise.all([
        disconnectDatabase().catch((err) => logger.error({ err }, 'Error disconnecting database')),
        disconnectRedis().catch((err) => logger.error({ err }, 'Error disconnecting Redis')),
        config.kafka.enabled
          ? disconnectKafka().catch((err) => logger.error({ err }, 'Error disconnecting Kafka'))
          : Promise.resolve(),
        config.websocket.enabled
          ? disconnectWebSocket().catch((err) =>
              logger.error({ err }, 'Error disconnecting WebSocket'),
            )
          : Promise.resolve(),
      ]);

      logger.info('All connections closed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
}

// Start the server
main().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
