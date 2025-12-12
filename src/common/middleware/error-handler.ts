/**
 * Global error handler middleware.
 * Catches all errors and returns standardized error responses.
 */

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config, SENSITIVE_FIELDS } from '../../config';
import { AppError, ErrorCode, ValidationError } from '../errors';
import { RequestWithId } from './request-id';

// Logger will be injected to avoid circular dependencies
type Logger = {
  error: (obj: Record<string, unknown>, msg?: string) => void;
};

let logger: Logger | null = null;

/**
 * Set the logger instance for error logging.
 */
export function setErrorLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

type SanitizableValue = unknown;

/**
 * Sanitize an object by redacting sensitive fields.
 */
function sanitizeObject(obj: SanitizableValue, depth = 0): SanitizableValue {
  if (depth > 5) return '[Max depth reached]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') return obj;

  if (obj instanceof Error) {
    if (config.isProduction) {
      return { name: obj.name, message: obj.message };
    }
    return { name: obj.name, message: obj.message, stack: obj.stack };
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  const sanitized: Record<string, SanitizableValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeObject(value, depth + 1);
    }
  }
  return sanitized;
}

/**
 * Convert Zod error to validation error
 */
function handleZodError(error: ZodError): ValidationError {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  return new ValidationError('Validation failed', { fields: details });
}

/**
 * Global error handler middleware.
 * Must be registered after all routes.
 */
export function errorHandler(
  err: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction,
): Response | void {
  const requestId = (req as RequestWithId).requestId;

  // Log the error with sanitized data
  if (logger) {
    const sanitizedErr = sanitizeObject(err);
    const sanitizedReq = {
      method: req.method,
      path: req.path,
      query: sanitizeObject(req.query),
      headers: sanitizeObject(req.headers),
      requestId,
    };

    logger.error({ err: sanitizedErr, req: sanitizedReq }, 'Unhandled error');
  }

  // Don't send response if headers already sent
  if (res.headersSent) {
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = handleZodError(err);
    return res.status(validationError.statusCode).json({
      success: false,
      error: validationError.message,
      code: validationError.code,
      requestId,
      details: validationError.details,
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    const message =
      config.isProduction && err.statusCode >= 500
        ? 'Internal Server Error'
        : err.message;

    return res.status(err.statusCode).json({
      success: false,
      error: message,
      code: err.code,
      requestId,
      ...(err.details && !config.isProduction ? { details: err.details } : {}),
    });
  }

  // Handle other errors
  const status = typeof err.status === 'number' ? err.status : 500;
  const errorCode = ErrorCode.INTERNAL_ERROR;

  const message =
    config.isProduction && status >= 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  return res.status(status).json({
    success: false,
    error: message,
    code: errorCode,
    requestId,
  });
}

