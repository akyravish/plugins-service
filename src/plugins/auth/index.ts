/**
 * Auth plugin definition.
 * Provides user authentication functionality.
 */

import { Router } from 'express';
import { Plugin, PluginContext } from '../../core/types';
import { setupRoutes } from './routes';
import { startAuthConsumers, stopAuthConsumers, setConsumerLogger } from './events';
import { registerAuthOpenAPI } from './openapi';
import { setupAuthSocketHandlers, cleanupAuthSocketHandlers, setAuthSocketLogger } from './socket';

/**
 * Auth plugin implementation
 */
const authPlugin: Plugin = {
  name: 'auth',
  version: '1.0.0',

  /**
   * Called when the plugin is first loaded
   */
  async onLoad(ctx: PluginContext): Promise<void> {
    ctx.logger.info('Auth plugin loading...');

    // Set logger for Kafka consumers and socket handlers
    setConsumerLogger(ctx.logger);
    setAuthSocketLogger(ctx.logger);

    // Register OpenAPI documentation
    registerAuthOpenAPI();
    ctx.logger.info('Auth plugin OpenAPI routes registered');
  },

  /**
   * Called when the plugin is enabled
   */
  async onEnable(ctx: PluginContext): Promise<void> {
    ctx.logger.info('Auth plugin enabled');

    // Start Kafka consumers
    try {
      await startAuthConsumers();
    } catch (error) {
      ctx.logger.warn({ error }, 'Failed to start Kafka consumers, continuing without messaging');
    }

    // Setup WebSocket handlers
    setupAuthSocketHandlers(ctx.io);
  },

  /**
   * Register plugin routes
   */
  routes(router: Router): void {
    setupRoutes(router);
  },

  /**
   * Called when the plugin is disabled
   */
  async onDisable(ctx: PluginContext): Promise<void> {
    ctx.logger.info('Auth plugin disabled');

    // Stop Kafka consumers
    await stopAuthConsumers();

    // Cleanup WebSocket handlers
    cleanupAuthSocketHandlers();
  },

  /**
   * Called when the plugin is unloaded
   */
  async onUnload(ctx: PluginContext): Promise<void> {
    ctx.logger.info('Auth plugin unloading...');
  },
};

export default authPlugin;
