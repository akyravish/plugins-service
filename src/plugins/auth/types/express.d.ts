/**
 * Express type extensions for auth plugin.
 * Extends the Express Request interface with user property.
 */

declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      email: string;
    };
  }
}

