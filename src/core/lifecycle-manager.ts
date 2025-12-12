/**
 * Plugin lifecycle manager.
 * Manages plugin states and executes lifecycle hooks.
 */

import {
  Plugin,
  PluginInstance,
  PluginMetadata,
  PluginContext,
  PluginState,
  PluginRegistry,
} from './types';
import { PluginLifecycleError, PluginLoadError } from '../common/errors';
import { createPluginLogger } from './logger';
import { prisma } from '../shared/db/prisma';
import { redis } from '../shared/cache/redis';
import { pluginEvents } from '../shared/events';
import logger from './logger';

/**
 * Plugin registry implementation
 */
class PluginRegistryImpl implements PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();

  get(name: string): PluginInstance | undefined {
    return this.plugins.get(name);
  }

  getAll(): Array<PluginInstance> {
    return Array.from(this.plugins.values());
  }

  getEnabled(): Array<PluginInstance> {
    return this.getAll().filter((p) => p.state === PluginState.ENABLED);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  register(instance: PluginInstance): void {
    this.plugins.set(instance.metadata.name, instance);
  }

  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }
}

/**
 * Singleton plugin registry
 */
export const pluginRegistry: PluginRegistry = new PluginRegistryImpl();

/**
 * Create a plugin context for a specific plugin
 */
export function createPluginContext(metadata: PluginMetadata): PluginContext {
  return {
    db: prisma,
    cache: redis,
    events: pluginEvents,
    logger: createPluginLogger(metadata.name),
    config: metadata,
  };
}

/**
 * Lifecycle manager for plugins
 */
export class LifecycleManager {
  /**
   * Load a plugin (execute onLoad hook)
   */
  async loadPlugin(
    plugin: Plugin,
    metadata: PluginMetadata,
    pluginPath: string,
  ): Promise<PluginInstance> {
    const context = createPluginContext(metadata);

    const instance: PluginInstance = {
      plugin,
      metadata,
      context,
      state: PluginState.UNLOADED,
      path: pluginPath,
    };

    try {
      // Execute onLoad hook
      if (plugin.onLoad) {
        await plugin.onLoad(context);
      }

      instance.state = PluginState.LOADED;
      pluginRegistry.register(instance);

      // Emit plugin loaded event
      pluginEvents.emitEvent('plugin:loaded', {
        name: metadata.name,
        version: metadata.version,
      });

      logger.info({ plugin: metadata.name }, 'Plugin loaded');
      return instance;
    } catch (error) {
      instance.state = PluginState.ERROR;
      throw new PluginLoadError(metadata.name, (error as Error).message);
    }
  }

  /**
   * Enable a plugin (execute onEnable hook)
   */
  async enablePlugin(name: string): Promise<void> {
    const instance = pluginRegistry.get(name);
    if (!instance) {
      throw new PluginLoadError(name, 'Plugin not found');
    }

    if (instance.state === PluginState.ENABLED) {
      return; // Already enabled
    }

    try {
      if (instance.plugin.onEnable) {
        await instance.plugin.onEnable(instance.context);
      }

      instance.state = PluginState.ENABLED;

      // Emit plugin enabled event
      pluginEvents.emitEvent('plugin:enabled', { name });

      logger.info({ plugin: name }, 'Plugin enabled');
    } catch (error) {
      instance.state = PluginState.ERROR;
      throw new PluginLifecycleError(name, 'onEnable', (error as Error).message);
    }
  }

  /**
   * Disable a plugin (execute onDisable hook)
   */
  async disablePlugin(name: string): Promise<void> {
    const instance = pluginRegistry.get(name);
    if (!instance) {
      throw new PluginLoadError(name, 'Plugin not found');
    }

    if (instance.state === PluginState.DISABLED || instance.state === PluginState.LOADED) {
      return; // Already disabled
    }

    try {
      if (instance.plugin.onDisable) {
        await instance.plugin.onDisable(instance.context);
      }

      instance.state = PluginState.DISABLED;

      // Emit plugin disabled event
      pluginEvents.emitEvent('plugin:disabled', { name });

      logger.info({ plugin: name }, 'Plugin disabled');
    } catch (error) {
      instance.state = PluginState.ERROR;
      throw new PluginLifecycleError(name, 'onDisable', (error as Error).message);
    }
  }

  /**
   * Unload a plugin (execute onUnload hook)
   */
  async unloadPlugin(name: string): Promise<void> {
    const instance = pluginRegistry.get(name);
    if (!instance) {
      return; // Already unloaded
    }

    try {
      // Disable first if enabled
      if (instance.state === PluginState.ENABLED) {
        await this.disablePlugin(name);
      }

      // Execute onUnload hook
      if (instance.plugin.onUnload) {
        await instance.plugin.onUnload(instance.context);
      }

      instance.state = PluginState.UNLOADED;
      pluginRegistry.unregister(name);

      // Emit plugin unloaded event
      pluginEvents.emitEvent('plugin:unloaded', { name });

      logger.info({ plugin: name }, 'Plugin unloaded');
    } catch (error) {
      instance.state = PluginState.ERROR;
      throw new PluginLifecycleError(name, 'onUnload', (error as Error).message);
    }
  }

  /**
   * Unload all plugins (for graceful shutdown)
   */
  async unloadAllPlugins(): Promise<void> {
    const plugins = pluginRegistry.getAll();

    // Unload in reverse order (last loaded first)
    for (const instance of plugins.reverse()) {
      try {
        await this.unloadPlugin(instance.metadata.name);
      } catch (error) {
        logger.error(
          { plugin: instance.metadata.name, error },
          'Error unloading plugin during shutdown',
        );
      }
    }
  }

  /**
   * Get plugin status
   */
  getPluginStatus(name: string): { state: PluginState; metadata: PluginMetadata } | null {
    const instance = pluginRegistry.get(name);
    if (!instance) return null;
    return { state: instance.state, metadata: instance.metadata };
  }

  /**
   * Get all plugin statuses
   */
  getAllPluginStatuses(): Array<{ name: string; state: PluginState; version: string }> {
    return pluginRegistry.getAll().map((instance) => ({
      name: instance.metadata.name,
      state: instance.state,
      version: instance.metadata.version,
    }));
  }
}

/**
 * Singleton lifecycle manager instance
 */
export const lifecycleManager = new LifecycleManager();

