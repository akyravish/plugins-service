/**
 * Custom error classes with error codes for better debugging and error handling.
 * Based on copy_service patterns.
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Not Found
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',

  // Conflict
  CONFLICT = 'CONFLICT',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',

  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Timeout
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',

  // Plugin Errors
  PLUGIN_LOAD_ERROR = 'PLUGIN_LOAD_ERROR',
  PLUGIN_LIFECYCLE_ERROR = 'PLUGIN_LIFECYCLE_ERROR',
}

/**
 * Base application error class.
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, details);
  }
}

/**
 * Generic not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: ErrorCode = ErrorCode.NOT_FOUND) {
    super(message, code, 404);
  }
}

/**
 * User not found error (404)
 */
export class UserNotFoundError extends NotFoundError {
  constructor(message: string = 'User not found') {
    super(message, ErrorCode.USER_NOT_FOUND);
  }
}

/**
 * Generic conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: ErrorCode = ErrorCode.CONFLICT) {
    super(message, code, 409);
  }
}

/**
 * User already exists error (409)
 */
export class UserAlreadyExistsError extends ConflictError {
  constructor(message: string = 'User already exists') {
    super(message, ErrorCode.USER_ALREADY_EXISTS);
  }
}

/**
 * Email already exists error (409)
 */
export class EmailAlreadyExistsError extends ConflictError {
  constructor(message: string = 'Email already exists') {
    super(message, ErrorCode.EMAIL_ALREADY_EXISTS);
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(message, code, 401);
  }
}

/**
 * Invalid credentials error (401)
 */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor(message: string = 'Invalid credentials') {
    super(message, ErrorCode.INVALID_CREDENTIALS);
  }
}

/**
 * Invalid token error (401)
 */
export class InvalidTokenError extends UnauthorizedError {
  constructor(message: string = 'Invalid token') {
    super(message, ErrorCode.INVALID_TOKEN);
  }
}

/**
 * Token expired error (401)
 */
export class TokenExpiredError extends UnauthorizedError {
  constructor(message: string = 'Token expired') {
    super(message, ErrorCode.TOKEN_EXPIRED);
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, ErrorCode.DATABASE_ERROR, 500);
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests, please try again later') {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429);
  }
}

/**
 * Request timeout error (408)
 */
export class RequestTimeoutError extends AppError {
  constructor(message: string = 'Request timeout') {
    super(message, ErrorCode.REQUEST_TIMEOUT, 408);
  }
}

/**
 * Plugin load error (500)
 */
export class PluginLoadError extends AppError {
  constructor(pluginName: string, message: string = 'Failed to load plugin') {
    super(`${message}: ${pluginName}`, ErrorCode.PLUGIN_LOAD_ERROR, 500);
  }
}

/**
 * Plugin lifecycle error (500)
 */
export class PluginLifecycleError extends AppError {
  constructor(pluginName: string, hook: string, message: string = 'Lifecycle hook failed') {
    super(`${message} (${hook}): ${pluginName}`, ErrorCode.PLUGIN_LIFECYCLE_ERROR, 500);
  }
}

