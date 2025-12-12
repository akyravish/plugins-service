/**
 * Typed event emitter for inter-plugin communication.
 * Plugins can emit and listen to events without direct imports.
 */

import { EventEmitter } from 'events';

/**
 * Define all possible event types and their payloads here.
 * This provides type safety for event emission and listening.
 */
export interface PluginEvents {
  // Auth plugin events
  'auth:user-created': { userId: string; email: string };
  'auth:user-logged-in': { userId: string; email: string };
  'auth:user-logged-out': { userId: string };
  'auth:password-changed': { userId: string };

  // Generic plugin events
  'plugin:loaded': { name: string; version: string };
  'plugin:enabled': { name: string };
  'plugin:disabled': { name: string };
  'plugin:unloaded': { name: string };

  // System events
  'system:shutdown': { reason: string };
  'system:health-check': { status: 'ok' | 'degraded' | 'error' };

  // Allow custom events with unknown payload
  [key: `custom:${string}`]: unknown;
}

/**
 * Typed event emitter class.
 * Extends Node's EventEmitter with type safety.
 */
export class TypedEventEmitter extends EventEmitter {
  /**
   * Emit a typed event.
   */
  emitEvent<K extends keyof PluginEvents>(event: K, payload: PluginEvents[K]): boolean {
    return this.emit(event, payload);
  }

  /**
   * Listen to a typed event.
   */
  onEvent<K extends keyof PluginEvents>(
    event: K,
    listener: (payload: PluginEvents[K]) => void,
  ): this {
    return this.on(event, listener);
  }

  /**
   * Listen to a typed event once.
   */
  onceEvent<K extends keyof PluginEvents>(
    event: K,
    listener: (payload: PluginEvents[K]) => void,
  ): this {
    return this.once(event, listener);
  }

  /**
   * Remove a typed event listener.
   */
  offEvent<K extends keyof PluginEvents>(
    event: K,
    listener: (payload: PluginEvents[K]) => void,
  ): this {
    return this.off(event, listener);
  }
}

/**
 * Singleton event emitter instance.
 * All plugins should use this shared instance.
 */
export const pluginEvents = new TypedEventEmitter();

// Set a high limit for event listeners (one per plugin per event type)
pluginEvents.setMaxListeners(100);

/**
 * Helper type for event handler functions
 */
export type EventHandler<K extends keyof PluginEvents> = (payload: PluginEvents[K]) => void;

/**
 * Export the events interface for extending
 */
export type { PluginEvents as EventTypes };

