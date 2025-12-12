/**
 * Core module barrel export.
 */

export { createApp, registerErrorHandler } from './app';
export { createPluginLoader, PluginLoader } from './plugin-loader';
export { lifecycleManager, pluginRegistry, createPluginContext, LifecycleManager } from './lifecycle-manager';
export { logger, createChildLogger, createPluginLogger } from './logger';
export * from './types';

