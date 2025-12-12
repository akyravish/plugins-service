/**
 * Async handler wrapper.
 * Catches errors from async route handlers and passes them to Express error handler.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async route handler to catch errors and forward them to the error handler.
 * Eliminates the need for try-catch blocks in every route handler.
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.getAll();
 *   res.json(users);
 * }));
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Alternative: wrap multiple handlers at once
 */
export function asyncHandlers(...fns: Array<AsyncRequestHandler>): Array<RequestHandler> {
  return fns.map((fn) => asyncHandler(fn));
}

