/**
 * Request logging middleware.
 * Logs incoming requests and outgoing responses.
 */

import { NextFunction, Request, Response } from 'express';
import { RequestWithId } from './request-id';

// Logger will be injected from core to avoid circular dependencies
type Logger = {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
};

let logger: Logger | null = null;

/**
 * Set the logger instance for request logging.
 * Should be called during app initialization.
 */
export function setRequestLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

/**
 * Middleware to log incoming requests and outgoing responses.
 * Logs method, path, status code, and response time.
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!logger) {
    return next();
  }

  const startTime = Date.now();
  const requestId = (req as RequestWithId).requestId;

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
    };

    if (res.statusCode >= 500) {
      logger?.error(logData, 'Request completed with error');
    } else if (res.statusCode >= 400) {
      logger?.warn(logData, 'Request completed with client error');
    } else {
      logger?.info(logData, 'Request completed');
    }
  });

  next();
}

