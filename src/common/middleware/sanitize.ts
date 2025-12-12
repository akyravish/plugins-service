/**
 * Input sanitization middleware.
 * Sanitizes query parameters, body, and route parameters.
 */

import { NextFunction, Request, Response } from 'express';

type SanitizableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<SanitizableValue>
  | { [key: string]: SanitizableValue };

/**
 * Sanitize a string by removing null bytes and trimming whitespace.
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  return value.replace(/\0/g, '').trim();
}

/**
 * Recursively sanitize an object or array.
 */
function sanitizeObject(obj: unknown, depth: number = 0): SanitizableValue {
  // Prevent infinite recursion
  if (depth > 10) return '[Max depth reached]';

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, SanitizableValue> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }

  return obj as SanitizableValue;
}

/**
 * Middleware to sanitize all incoming request data.
 * Removes null bytes from strings and trims whitespace.
 */
export function sanitizeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    // Sanitize query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      req.query = sanitizeObject(req.query) as typeof req.query;
    }

    // Sanitize body parameters
    if (req.body && Object.keys(req.body).length > 0) {
      req.body = sanitizeObject(req.body) as typeof req.body;
    }

    // Sanitize route parameters
    if (req.params && Object.keys(req.params).length > 0) {
      req.params = sanitizeObject(req.params) as typeof req.params;
    }

    next();
  } catch {
    res.status(400).json({
      success: false,
      error: 'Invalid input detected',
      code: 'INVALID_INPUT',
    });
  }
}

