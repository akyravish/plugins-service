/**
 * Shared infrastructure barrel export.
 * Provides convenient access to all shared services.
 */

// Database
export { prisma, connectDatabase, disconnectDatabase, checkDatabaseHealth } from './db/prisma';

// Cache
export {
  redis,
  connectRedis,
  disconnectRedis,
  checkRedisHealth,
  setRedisLogger,
  cache,
} from './cache/redis';

// Messaging (Kafka)
export {
  initKafka,
  disconnectKafka,
  getProducer,
  getAdmin,
  sendMessage,
  sendMessages,
  createConsumer,
  stopConsumer,
  createTopic,
  checkKafkaHealth,
  setKafkaLogger,
  kafka,
} from './messaging';
export type { MessageHandler } from './messaging';

// Events
export { pluginEvents, TypedEventEmitter } from './events';
export type { PluginEvents, EventHandler, EventTypes } from './events';

// Utils
export * from './utils';

