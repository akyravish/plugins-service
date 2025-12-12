/**
 * Core type definitions for the plugin architecture.
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Logger } from 'pino';
import { Server } from 'socket.io';
import { TypedEventEmitter } from '../shared/events';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../shared/websocket/types';

/**
 * Typed Socket.io server type
 */
export type TypedSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Plugin metadata from plugin.json
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  author?: string;
}

/**
 * Context provided to plugins during lifecycle hooks.
 * Contains access to shared infrastructure and services.
 */
export interface PluginContext {
  /** Prisma database client */
  db: PrismaClient;
  /** Redis cache client */
  cache: Redis;
  /** Typed event emitter for inter-plugin communication */
  events: TypedEventEmitter;
  /** Logger instance scoped to the plugin */
  logger: Logger;
  /** Plugin configuration from plugin.json */
  config: PluginMetadata;
  /** Socket.io server instance for real-time communication (may be null if WebSocket disabled) */
  io: TypedSocketServer | null;
}

/**
 * Plugin interface that all plugins must implement.
 * Plugins export a default object conforming to this interface.
 */
export interface Plugin {
  /** Plugin name (must match plugin.json) */
  name: string;
  /** Plugin version (must match plugin.json) */
  version: string;

  /**
   * Called when the plugin is first loaded.
   * Use for initialization that doesn't require the plugin to be active.
   */
  onLoad?(ctx: PluginContext): Promise<void>;

  /**
   * Called when the plugin is enabled/activated.
   * Use for starting services, registering event listeners, etc.
   */
  onEnable?(ctx: PluginContext): Promise<void>;

  /**
   * Called when the plugin is disabled/deactivated.
   * Use for stopping services, cleaning up resources, etc.
   */
  onDisable?(ctx: PluginContext): Promise<void>;

  /**
   * Called when the plugin is unloaded (app shutdown).
   * Use for final cleanup, closing connections, etc.
   */
  onUnload?(ctx: PluginContext): Promise<void>;

  /**
   * Register plugin routes on the provided router.
   * Routes will be mounted at /api/v1/{plugin-name}/
   */
  routes?(router: Router): void;
}

/**
 * Plugin instance stored in the registry
 */
export interface PluginInstance {
  /** The plugin module */
  plugin: Plugin;
  /** Plugin metadata from plugin.json */
  metadata: PluginMetadata;
  /** Plugin context */
  context: PluginContext;
  /** Current state */
  state: PluginState;
  /** Plugin directory path */
  path: string;
}

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADED = 'loaded',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
}

/**
 * Plugin loader options
 */
export interface PluginLoaderOptions {
  /** Directory containing plugins */
  pluginsDir: string;
  /** Whether to auto-enable plugins on load */
  autoEnable?: boolean;
}

/**
 * Result of plugin loading
 */
export interface PluginLoadResult {
  success: boolean;
  pluginName: string;
  error?: Error;
}

/**
 * Plugin registry for managing loaded plugins
 */
export interface PluginRegistry {
  /** Get a plugin by name */
  get(name: string): PluginInstance | undefined;
  /** Get all plugins */
  getAll(): Array<PluginInstance>;
  /** Get all enabled plugins */
  getEnabled(): Array<PluginInstance>;
  /** Check if a plugin exists */
  has(name: string): boolean;
  /** Register a plugin */
  register(instance: PluginInstance): void;
  /** Unregister a plugin */
  unregister(name: string): boolean;
}
