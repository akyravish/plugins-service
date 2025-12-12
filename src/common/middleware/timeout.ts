/**
 * Request timeout middleware.
 * Automatically times out requests that take too long.
 */

import { NextFunction, Request, Response } from 'express';
import { config } from '../../config';

/**
 * Middleware to set a timeout on requests.
 * Returns 408 Request Timeout if the request takes too long.
 */
export function timeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const timeoutMs = config.requestTimeoutMs;
  let timeoutId: NodeJS.Timeout | null = null;

  // Set timeout on the request socket
  req.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request timeout',
        code: 'REQUEST_TIMEOUT',
      });
    }
    // Destroy the socket to abort ongoing operations
    if (req.socket && !req.socket.destroyed) {
      req.socket.destroy();
    }
  });

  // Backup timeout using setTimeout
  timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request timeout',
        code: 'REQUEST_TIMEOUT',
      });
    }
    if (req.socket && !req.socket.destroyed) {
      req.socket.destroy();
    }
  }, timeoutMs);

  // Clear timeout when response finishes or closes
  const clearTimeouts = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    req.setTimeout(0);
  };

  res.on('finish', clearTimeouts);
  res.on('close', clearTimeouts);

  next();
}

