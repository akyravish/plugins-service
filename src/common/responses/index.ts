/**
 * Response utilities for consistent API response formatting.
 * Provides type-safe response builders for success and error cases.
 */

import { Response } from 'express';
import { AppError, ErrorCode } from '../errors';

/**
 * Generic success response structure
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Generic error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  requestId?: string;
  details?: Record<string, unknown>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Response type union
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Send a successful response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string,
  meta?: Record<string, unknown>,
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  if (meta && Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
): Response {
  return sendSuccess(res, data, 201, message, meta);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  error: AppError | Error,
  requestId?: string,
  details?: Record<string, unknown>,
): Response {
  let statusCode: number;
  let errorMessage: string;
  let errorCode: ErrorCode;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorMessage = error.message;
    errorCode = error.code;
    details = details || error.details;
  } else {
    statusCode = 500;
    errorMessage = error.message || 'Internal Server Error';
    errorCode = ErrorCode.INTERNAL_ERROR;
  }

  const response: ErrorResponse = {
    success: false,
    error: errorMessage,
    code: errorCode,
  };

  if (requestId) {
    response.requestId = requestId;
  }

  if (details && Object.keys(details).length > 0) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a success response with pagination metadata
 */
export function sendPaginatedSuccess<T>(
  res: Response,
  data: Array<T>,
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  statusCode: number = 200,
  message?: string,
): Response {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const paginationMeta: PaginationMeta = {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };

  return sendSuccess(res, data, statusCode, message, { pagination: paginationMeta });
}

/**
 * Extract request ID from request object
 */
export function getRequestId(req: { requestId?: string }): string | undefined {
  return req.requestId;
}

/**
 * Type guard to check if request has requestId
 */
export function hasRequestId(req: unknown): req is { requestId: string } {
  return (
    typeof req === 'object' &&
    req !== null &&
    'requestId' in req &&
    typeof (req as { requestId?: string }).requestId === 'string'
  );
}

