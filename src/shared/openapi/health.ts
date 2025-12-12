/**
 * OpenAPI documentation for the health endpoint.
 */

import { z } from 'zod';
import { openApiRegistry } from './index';

/**
 * Health response schema
 */
const HealthResponseSchema = z
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
 * Health error response schema
 */
const HealthErrorResponseSchema = z
  .object({
    status: z.literal('error').openapi({
      description: 'Error status',
      example: 'error',
    }),
    timestamp: z.string().datetime().openapi({
      description: 'ISO timestamp of the health check',
      example: '2025-12-12T10:00:00.000Z',
    }),
  })
  .openapi('HealthErrorResponse', {
    description: 'Health check error response',
  });

/**
 * Register health endpoint with OpenAPI
 */
export function registerHealthOpenAPI(): void {
  openApiRegistry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Health check',
    description:
      'Returns the health status of the server and its dependent services (database, Redis, Kafka).',
    responses: {
      200: {
        description: 'All services are healthy',
        content: {
          'application/json': {
            schema: HealthResponseSchema,
          },
        },
      },
      503: {
        description: 'One or more services are unhealthy (degraded state)',
        content: {
          'application/json': {
            schema: HealthResponseSchema,
          },
        },
      },
      500: {
        description: 'Health check failed',
        content: {
          'application/json': {
            schema: HealthErrorResponseSchema,
          },
        },
      },
    },
    security: [],
  });
}
