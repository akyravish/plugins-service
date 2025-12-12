/**
 * Auth plugin Kafka event consumer.
 * Consumes authentication events from Kafka topics.
 */

import { createConsumer, stopConsumer, MessageHandler } from '../../../shared/messaging';
import { config } from '../../../config';
import { AUTH_TOPICS, UserEvent, AuditLogEntry } from './producer';

// Logger will be passed from plugin context
type Logger = {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
};

let logger: Logger | null = null;

/**
 * Consumer group IDs
 */
const CONSUMER_GROUPS = {
  USER_EVENTS: 'auth-user-events-consumer',
  AUDIT_LOG: 'auth-audit-log-consumer',
} as const;

/**
 * Set the logger for consumers
 */
export function setConsumerLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

/**
 * Handle user events
 */
const handleUserEvent: MessageHandler<UserEvent> = async (message, metadata) => {
  logger?.info(
    {
      type: message.type,
      userId: message.userId,
      email: message.email,
      topic: metadata.topic,
      partition: metadata.partition,
    },
    'Received user event',
  );

  // Add your business logic here
  // For example: send welcome email, update analytics, etc.
  switch (message.type) {
    case 'USER_CREATED':
      // Handle new user creation
      break;
    case 'USER_LOGGED_IN':
      // Handle user login
      break;
    case 'USER_LOGGED_OUT':
      // Handle user logout
      break;
    case 'PASSWORD_CHANGED':
      // Handle password change
      break;
  }
};

/**
 * Handle audit log events
 */
const handleAuditLog: MessageHandler<AuditLogEntry> = async (message, metadata) => {
  logger?.info(
    {
      action: message.action,
      userId: message.userId,
      success: message.success,
      topic: metadata.topic,
    },
    'Received audit log entry',
  );

  // Add your business logic here
  // For example: store in audit database, send alerts, etc.
};

/**
 * Start all auth consumers
 */
export async function startAuthConsumers(): Promise<void> {
  if (!config.kafka.enabled) {
    return;
  }

  try {
    // Start user events consumer
    await createConsumer(
      CONSUMER_GROUPS.USER_EVENTS,
      [AUTH_TOPICS.USER_EVENTS],
      handleUserEvent,
    );

    // Start audit log consumer
    await createConsumer(
      CONSUMER_GROUPS.AUDIT_LOG,
      [AUTH_TOPICS.AUDIT_LOG],
      handleAuditLog,
    );

    logger?.info({}, 'Auth Kafka consumers started');
  } catch (error) {
    logger?.error({ error }, 'Failed to start auth consumers');
    throw error;
  }
}

/**
 * Stop all auth consumers
 */
export async function stopAuthConsumers(): Promise<void> {
  if (!config.kafka.enabled) {
    return;
  }

  try {
    await Promise.all([
      stopConsumer(CONSUMER_GROUPS.USER_EVENTS),
      stopConsumer(CONSUMER_GROUPS.AUDIT_LOG),
    ]);

    logger?.info({}, 'Auth Kafka consumers stopped');
  } catch (error) {
    logger?.error({ error }, 'Error stopping auth consumers');
  }
}

