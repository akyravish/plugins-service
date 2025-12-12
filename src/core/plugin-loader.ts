/**
 * Plugin loader.
 * Dynamically loads and registers plugins from the plugins directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Router, Express } from 'express';
import { Plugin, PluginMetadata, PluginLoadResult, PluginLoaderOptions } from './types';
import { lifecycleManager, pluginRegistry } from './lifecycle-manager';
import { PluginLoadError } from '../common/errors';
import { APP_CONSTANTS } from '../config/constants';
import logger from './logger';

/**
 * Validate plugin metadata from plugin.json
 */
function validateMetadata(metadata: unknown, pluginDir: string): PluginMetadata {
  if (!metadata || typeof metadata !== 'object') {
    throw new PluginLoadError(pluginDir, 'Invalid plugin.json: not an object');
  }

  const meta = metadata as Record<string, unknown>;

  if (typeof meta.name !== 'string' || !meta.name) {
    throw new PluginLoadError(pluginDir, 'Invalid plugin.json: missing or invalid name');
  }

  if (typeof meta.version !== 'string' || !meta.version) {
    throw new PluginLoadError(pluginDir, 'Invalid plugin.json: missing or invalid version');
  }

  return {
    name: meta.name,
    version: meta.version,
    description: typeof meta.description === 'string' ? meta.description : undefined,
    enabled: meta.enabled !== false, // Default to enabled if not specified
    author: typeof meta.author === 'string' ? meta.author : undefined,
  };
}

/**
 * Load a single plugin from a directory
 */
async function loadPluginFromDirectory(
  pluginDir: string,
): Promise<{ plugin: Plugin; metadata: PluginMetadata } | null> {
  const configPath = path.join(pluginDir, APP_CONSTANTS.PLUGIN_CONFIG_FILE);
  const indexPath = path.join(pluginDir, 'index.ts');
  const indexJsPath = path.join(pluginDir, 'index.js');

  // Check if plugin.json exists
  if (!fs.existsSync(configPath)) {
    logger.warn({ dir: pluginDir }, 'Skipping directory: no plugin.json found');
    return null;
  }

  // Read and validate plugin.json
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const rawMetadata = JSON.parse(configContent);
  const metadata = validateMetadata(rawMetadata, pluginDir);

  // Skip disabled plugins
  if (!metadata.enabled) {
    logger.info({ plugin: metadata.name }, 'Plugin is disabled, skipping');
    return null;
  }

  // Determine which file to import
  let modulePath: string;
  if (fs.existsSync(indexPath)) {
    modulePath = indexPath;
  } else if (fs.existsSync(indexJsPath)) {
    modulePath = indexJsPath;
  } else {
    throw new PluginLoadError(metadata.name, 'No index.ts or index.js found');
  }

  // Import the plugin module
  const pluginModule = await import(modulePath);
  const plugin: Plugin = pluginModule.default;

  // Validate plugin structure
  if (!plugin || typeof plugin !== 'object') {
    throw new PluginLoadError(metadata.name, 'Plugin does not export a default object');
  }

  if (plugin.name !== metadata.name) {
    throw new PluginLoadError(
      metadata.name,
      `Plugin name mismatch: ${plugin.name} vs ${metadata.name}`,
    );
  }

  return { plugin, metadata };
}

/**
 * Plugin loader class
 */
export class PluginLoader {
  private pluginsDir: string;
  private autoEnable: boolean;

  constructor(options: PluginLoaderOptions) {
    this.pluginsDir = options.pluginsDir;
    this.autoEnable = options.autoEnable ?? true;
  }

  /**
   * Discover and load all plugins from the plugins directory
   */
  async loadAllPlugins(): Promise<Array<PluginLoadResult>> {
    const results: Array<PluginLoadResult> = [];

    // Check if plugins directory exists
    if (!fs.existsSync(this.pluginsDir)) {
      logger.warn({ dir: this.pluginsDir }, 'Plugins directory does not exist');
      return results;
    }

    // Get all directories in the plugins folder
    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    const pluginDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(this.pluginsDir, entry.name));

    // Load each plugin
    for (const pluginDir of pluginDirs) {
      try {
        const loaded = await loadPluginFromDirectory(pluginDir);
        if (!loaded) {
          continue; // Skip disabled or invalid plugins
        }

        const { plugin, metadata } = loaded;

        // Load the plugin (execute onLoad hook)
        await lifecycleManager.loadPlugin(plugin, metadata, pluginDir);

        // Auto-enable if configured
        if (this.autoEnable) {
          await lifecycleManager.enablePlugin(metadata.name);
        }

        results.push({ success: true, pluginName: metadata.name });
      } catch (error) {
        const pluginName = path.basename(pluginDir);
        logger.error({ plugin: pluginName, error }, 'Failed to load plugin');
        results.push({
          success: false,
          pluginName,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return results;
  }

  /**
   * Register plugin routes on the Express app
   */
  registerPluginRoutes(app: Express): void {
    const enabledPlugins = pluginRegistry.getEnabled();

    for (const instance of enabledPlugins) {
      if (instance.plugin.routes) {
        const router = Router();
        instance.plugin.routes(router);

        // Mount routes at /api/v1/{plugin-name}/
        const mountPath = `${APP_CONSTANTS.API_PREFIX}/${APP_CONSTANTS.API_VERSION}/${instance.metadata.name}`;
        app.use(mountPath, router);

        logger.info({ plugin: instance.metadata.name, path: mountPath }, 'Plugin routes registered');
      }
    }
  }

  /**
   * Reload a specific plugin
   */
  async reloadPlugin(name: string): Promise<void> {
    const instance = pluginRegistry.get(name);
    if (!instance) {
      throw new PluginLoadError(name, 'Plugin not found');
    }

    // Unload the plugin
    await lifecycleManager.unloadPlugin(name);

    // Re-load from directory
    const loaded = await loadPluginFromDirectory(instance.path);
    if (!loaded) {
      throw new PluginLoadError(name, 'Failed to reload plugin');
    }

    const { plugin, metadata } = loaded;
    await lifecycleManager.loadPlugin(plugin, metadata, instance.path);
    await lifecycleManager.enablePlugin(name);

    logger.info({ plugin: name }, 'Plugin reloaded');
  }

  /**
   * Get the plugins directory path
   */
  getPluginsDir(): string {
    return this.pluginsDir;
  }
}

/**
 * Create a plugin loader instance
 */
export function createPluginLoader(pluginsDir: string, autoEnable = true): PluginLoader {
  return new PluginLoader({ pluginsDir, autoEnable });
}

