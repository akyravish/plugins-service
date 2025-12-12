/**
 * Auth plugin OpenAPI documentation.
 * Registers all auth routes with the OpenAPI registry.
 */

import { z } from 'zod';
import { openApiRegistry, createSuccessResponseSchema } from '../../shared/openapi';
import { ErrorResponseSchema, UserSchema } from '../../shared/openapi/schemas';

/**
 * Register request body schema
 */
const RegisterRequestSchema = z
  .object({
    email: z.string().email().openapi({
      description: 'User email address',
      example: 'user@example.com',
    }),
    password: z.string().min(8).openapi({
      description: 'User password (min 8 characters)',
      example: 'SecurePass123!',
    }),
    name: z.string().min(2).max(100).openapi({
      description: 'User display name',
      example: 'John Doe',
    }),
  })
  .openapi('RegisterRequest', {
    description: 'User registration request body',
  });

/**
 * Login request body schema
 */
const LoginRequestSchema = z
  .object({
    email: z.string().email().openapi({
      description: 'User email address',
      example: 'user@example.com',
    }),
    password: z.string().min(1).openapi({
      description: 'User password',
      example: 'SecurePass123!',
    }),
  })
  .openapi('LoginRequest', {
    description: 'User login request body',
  });

/**
 * Auth response data schema (user + token)
 */
const AuthResponseDataSchema = z
  .object({
    user: UserSchema,
    token: z.string().openapi({
      description: 'JWT access token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    expiresIn: z.string().openapi({
      description: 'Token expiration duration',
      example: '7d',
    }),
  })
  .openapi('AuthResponseData', {
    description: 'Authentication response data',
  });

/**
 * User response data schema
 */
const UserResponseDataSchema = z
  .object({
    user: UserSchema,
  })
  .openapi('UserResponseData', {
    description: 'User data response',
  });

/**
 * Register all auth plugin schemas
 */
openApiRegistry.register('RegisterRequest', RegisterRequestSchema);
openApiRegistry.register('LoginRequest', LoginRequestSchema);
openApiRegistry.register('AuthResponseData', AuthResponseDataSchema);
openApiRegistry.register('UserResponseData', UserResponseDataSchema);

/**
 * Register auth plugin OpenAPI routes
 */
export function registerAuthOpenAPI(): void {
  // POST /api/v1/auth/register
  openApiRegistry.registerPath({
    method: 'post',
    path: '/api/v1/auth/register',
    tags: ['Auth'],
    summary: 'Register a new user',
    description:
      'Create a new user account with email, password, and name. Returns the created user and an authentication token.',
    request: {
      body: {
        content: {
          'application/json': {
            schema: RegisterRequestSchema,
          },
        },
        required: true,
      },
    },
    responses: {
      201: {
        description: 'User registered successfully',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(AuthResponseDataSchema, 'Registration successful'),
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      409: {
        description: 'Email already exists',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      429: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    security: [],
  });

  // POST /api/v1/auth/login
  openApiRegistry.registerPath({
    method: 'post',
    path: '/api/v1/auth/login',
    tags: ['Auth'],
    summary: 'Login user',
    description:
      'Authenticate a user with email and password. Returns the user and an authentication token.',
    request: {
      body: {
        content: {
          'application/json': {
            schema: LoginRequestSchema,
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(AuthResponseDataSchema, 'Login successful'),
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Invalid credentials',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
      429: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    security: [],
  });

  // GET /api/v1/auth/me
  openApiRegistry.registerPath({
    method: 'get',
    path: '/api/v1/auth/me',
    tags: ['Auth'],
    summary: 'Get current user',
    description: "Get the currently authenticated user's information. Requires a valid JWT token.",
    responses: {
      200: {
        description: 'Current user data',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(UserResponseDataSchema, 'User data retrieved'),
          },
        },
      },
      401: {
        description: 'Unauthorized - missing or invalid token',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  });
}
