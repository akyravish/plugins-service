/**
 * Common OpenAPI schemas for API responses.
 * These schemas are reusable across all plugins.
 */

import { z } from 'zod';
import { openApiRegistry } from './index';

/**
 * Error codes enum for API responses
 */
export const ErrorCodeSchema = z
  .enum([
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'CONFLICT',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
    'BAD_REQUEST',
    'SERVICE_UNAVAILABLE',
  ])
  .openapi({
    description: 'Error code identifying the type of error',
    example: 'VALIDATION_ERROR',
  });

/**
 * Error response schema
 */
export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string().openapi({
      description: 'Human-readable error message',
      example: 'Invalid email format',
    }),
    code: ErrorCodeSchema,
    requestId: z.string().optional().openapi({
      description: 'Unique request identifier for debugging',
      example: 'req_abc123',
    }),
    details: z.record(z.unknown()).optional().openapi({
      description: 'Additional error details',
    }),
  })
  .openapi('ErrorResponse', {
    description: 'Standard error response structure',
  });

/**
 * Pagination metadata schema
 */
export const PaginationMetaSchema = z
  .object({
    page: z.number().int().positive().openapi({
      description: 'Current page number',
      example: 1,
    }),
    limit: z.number().int().positive().openapi({
      description: 'Items per page',
      example: 20,
    }),
    total: z.number().int().nonnegative().openapi({
      description: 'Total number of items',
      example: 100,
    }),
    totalPages: z.number().int().nonnegative().openapi({
      description: 'Total number of pages',
      example: 5,
    }),
    hasNextPage: z.boolean().openapi({
      description: 'Whether there is a next page',
      example: true,
    }),
    hasPreviousPage: z.boolean().openapi({
      description: 'Whether there is a previous page',
      example: false,
    }),
  })
  .openapi('PaginationMeta', {
    description: 'Pagination metadata',
  });

/**
 * Health check response schema
 */
export const HealthResponseSchema = z
  .object({
    status: z.enum(['ok', 'degraded', 'error']).openapi({
      description: 'Overall health status',
      example: 'ok',
    }),
    timestamp: z.string().datetime().openapi({
      description: 'ISO timestamp of the health check',
      example: '2025-12-12T10:00:00.000Z',
    }),
    uptime: z.number().openapi({
      description: 'Server uptime in seconds',
      example: 3600,
    }),
    version: z.string().openapi({
      description: 'API version',
      example: 'v1',
    }),
    environment: z.string().openapi({
      description: 'Current environment',
      example: 'development',
    }),
    services: z.record(z.enum(['connected', 'disconnected'])).openapi({
      description: 'Status of dependent services',
      example: {
        database: 'connected',
        redis: 'connected',
        kafka: 'connected',
      },
    }),
  })
  .openapi('HealthResponse', {
    description: 'Health check response',
  });

/**
 * User schema (public fields only)
 */
export const UserSchema = z
  .object({
    id: z.string().openapi({
      description: 'Unique user identifier',
      example: 'clx1234567890',
    }),
    email: z.string().email().openapi({
      description: 'User email address',
      example: 'user@example.com',
    }),
    name: z.string().openapi({
      description: 'User display name',
      example: 'John Doe',
    }),
    createdAt: z.string().datetime().openapi({
      description: 'Account creation timestamp',
      example: '2025-01-01T00:00:00.000Z',
    }),
    updatedAt: z.string().datetime().openapi({
      description: 'Last update timestamp',
      example: '2025-01-01T00:00:00.000Z',
    }),
  })
  .openapi('User', {
    description: 'User object (public fields)',
  });

/**
 * Auth token response schema
 */
export const AuthTokenSchema = z
  .object({
    token: z.string().openapi({
      description: 'JWT access token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    expiresIn: z.string().openapi({
      description: 'Token expiration duration',
      example: '7d',
    }),
  })
  .openapi('AuthToken', {
    description: 'Authentication token',
  });

// Register common schemas with the registry
openApiRegistry.register('ErrorResponse', ErrorResponseSchema);
openApiRegistry.register('PaginationMeta', PaginationMetaSchema);
openApiRegistry.register('HealthResponse', HealthResponseSchema);
openApiRegistry.register('User', UserSchema);
openApiRegistry.register('AuthToken', AuthTokenSchema);

// Export types
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
