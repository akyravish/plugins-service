/**
 * Request ID middleware.
 * Attaches or propagates X-Request-ID for request tracing.
 */

import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { APP_CONSTANTS } from '../../config/constants';

export interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Middleware to attach a unique request ID to each request.
 * Uses existing X-Request-ID header if present, otherwise generates a new UUID.
 */
export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
): void {
  const existingId = req.headers[APP_CONSTANTS.REQUEST_ID_HEADER.toLowerCase()] as string;
  const requestId = existingId || randomUUID();

  req.requestId = requestId;
  res.setHeader(APP_CONSTANTS.REQUEST_ID_HEADER, requestId);

  next();
}

