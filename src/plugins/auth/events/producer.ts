/**
 * Auth plugin Kafka event producer.
 * Publishes authentication events to Kafka topics.
 */

import { sendMessage } from '../../../shared/messaging';
import { config } from '../../../config';

/**
 * Kafka topics for auth events
 */
export const AUTH_TOPICS = {
  USER_EVENTS: 'auth.user.events',
  AUDIT_LOG: 'auth.audit.log',
} as const;

/**
 * User event types
 */
export type UserEventType = 'USER_CREATED' | 'USER_LOGGED_IN' | 'USER_LOGGED_OUT' | 'PASSWORD_CHANGED';

/**
 * User event payload
 */
export interface UserEvent {
  type: UserEventType;
  userId: string;
  email: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  action: string;
  userId: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
  success: boolean;
  details?: Record<string, unknown>;
}

/**
 * Publish a user event to Kafka
 */
export async function publishUserEvent(
  type: UserEventType,
  userId: string,
  email: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!config.kafka.enabled) {
    return;
  }

  const event: UserEvent = {
    type,
    userId,
    email,
    timestamp: new Date().toISOString(),
    metadata,
  };

  await sendMessage(AUTH_TOPICS.USER_EVENTS, event, userId);
}

/**
 * Publish an audit log entry to Kafka
 */
export async function publishAuditLog(
  action: string,
  userId: string,
  success: boolean,
  options?: {
    ip?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  if (!config.kafka.enabled) {
    return;
  }

  const entry: AuditLogEntry = {
    action,
    userId,
    timestamp: new Date().toISOString(),
    success,
    ip: options?.ip,
    userAgent: options?.userAgent,
    details: options?.details,
  };

  await sendMessage(AUTH_TOPICS.AUDIT_LOG, entry, userId);
}

/**
 * Publish user created event
 */
export async function publishUserCreated(userId: string, email: string): Promise<void> {
  await publishUserEvent('USER_CREATED', userId, email);
}

/**
 * Publish user logged in event
 */
export async function publishUserLoggedIn(
  userId: string,
  email: string,
  ip?: string,
  userAgent?: string,
): Promise<void> {
  await publishUserEvent('USER_LOGGED_IN', userId, email, { ip, userAgent });
  await publishAuditLog('LOGIN', userId, true, { ip, userAgent });
}

/**
 * Publish user logged out event
 */
export async function publishUserLoggedOut(userId: string, email: string): Promise<void> {
  await publishUserEvent('USER_LOGGED_OUT', userId, email);
}

/**
 * Publish failed login attempt
 */
export async function publishFailedLogin(
  email: string,
  ip?: string,
  userAgent?: string,
): Promise<void> {
  await publishAuditLog('LOGIN_FAILED', email, false, { ip, userAgent, details: { email } });
}

