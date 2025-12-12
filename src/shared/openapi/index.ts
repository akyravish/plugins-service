/**
 * OpenAPI documentation registry and spec generator.
 * Uses zod-to-openapi to auto-generate OpenAPI specs from Zod schemas.
 */

import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI capabilities
extendZodWithOpenApi(z);

/**
 * Singleton OpenAPI registry for all plugins to register their routes
 */
export const openApiRegistry = new OpenAPIRegistry();

/**
 * OpenAPI document metadata
 */
export interface OpenAPIDocumentInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

/**
 * Default document info
 */
const defaultDocumentInfo: OpenAPIDocumentInfo = {
  title: 'Plugin Arc API',
  version: '1.0.0',
  description:
    'A plugin-based modular Node.js API with dynamic plugin loading and lifecycle management',
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
  },
};

/**
 * Security schemes for the API
 */
const securitySchemes = {
  bearerAuth: {
    type: 'http' as const,
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT authentication token',
  },
};

/**
 * Generate the complete OpenAPI document
 */
export function generateOpenAPIDocument(
  info: Partial<OpenAPIDocumentInfo> = {},
): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  const mergedInfo = { ...defaultDocumentInfo, ...info };

  const generator = new OpenApiGeneratorV3(openApiRegistry.definitions);

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: mergedInfo.title,
      version: mergedInfo.version,
      description: mergedInfo.description,
      contact: mergedInfo.contact,
      license: mergedInfo.license,
    },
    servers: [
      {
        url: `{protocol}://{host}:{port}`,
        description: 'API Server',
        variables: {
          protocol: {
            default: 'http',
            enum: ['http', 'https'],
          },
          host: {
            default: 'localhost',
          },
          port: {
            default: '4000',
          },
        },
      },
    ],
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: 'Health',
        description: 'System health check endpoints',
      },
      {
        name: 'Auth',
        description: 'Authentication and user management',
      },
    ],
  });
}

/**
 * Register the security schemes
 */
openApiRegistry.registerComponent('securitySchemes', 'bearerAuth', securitySchemes.bearerAuth);

/**
 * Helper to create a success response schema wrapper
 */
export function createSuccessResponseSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
  description: string,
) {
  return z
    .object({
      success: z.literal(true),
      data: dataSchema,
      message: z.string().optional(),
      meta: z.record(z.unknown()).optional(),
    })
    .openapi({
      description,
    });
}

/**
 * Helper to create a paginated response schema wrapper
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  description: string,
) {
  return z
    .object({
      success: z.literal(true),
      data: z.array(itemSchema),
      message: z.string().optional(),
      meta: z.object({
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          totalPages: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      }),
    })
    .openapi({
      description,
    });
}

// Re-export for convenience
export { OpenAPIRegistry, z };
export type { RouteConfig } from '@asteasolutions/zod-to-openapi';
