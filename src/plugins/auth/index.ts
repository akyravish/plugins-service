/**
 * Auth plugin definition.
 * Provides user authentication functionality.
 */

import { Router } from 'express';
import { Plugin, PluginContext } from '../../core/types';
import { setupRoutes } from './routes';
import { startAuthConsumers, stopAuthConsumers, setConsumerLogger } from './events';

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
    
    // Set logger for Kafka consumers
    setConsumerLogger(ctx.logger);
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

    // Example: Listen to events from other plugins
    // ctx.events.onEvent('some:event', (data) => {
    //   ctx.logger.info({ data }, 'Received event');
    // });
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
  },

  /**
   * Called when the plugin is unloaded
   */
  async onUnload(ctx: PluginContext): Promise<void> {
    ctx.logger.info('Auth plugin unloading...');
  },
};

export default authPlugin;

