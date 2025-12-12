/**
 * Auth plugin middleware.
 * Provides authentication middleware for protecting routes.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from './service';
import { UnauthorizedError, InvalidTokenError } from '../../common/errors';
import { prisma } from '../../shared/db/prisma';
import { config } from '../../config';

const authService = new AuthService(prisma);

/**
 * Authentication middleware.
 * Verifies JWT token from Authorization header or cookie.
 * Attaches user info to request object.
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    // Get token from Authorization header or cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies[config.jwt.cookieName]) {
      token = req.cookies[config.jwt.cookieName];
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const decoded = authService.verifyToken(token);

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof InvalidTokenError) {
      next(error);
    } else {
      next(new InvalidTokenError());
    }
  }
}

/**
 * Optional authentication middleware.
 * If token is present, verifies it and attaches user.
 * If no token, continues without user.
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies[config.jwt.cookieName]) {
      token = req.cookies[config.jwt.cookieName];
    }

    if (token) {
      const decoded = authService.verifyToken(token);
      req.user = decoded;
    }

    next();
  } catch {
    // Token invalid, continue without user
    next();
  }
}

