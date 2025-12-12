/**
 * Common Zod validation schemas used across plugins.
 * Plugins can extend or compose these schemas.
 */

import { z } from 'zod';
import { APP_CONSTANTS } from '../../config/constants';

/**
 * Pagination query parameters schema
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((val) => val >= 1, { message: 'Page must be at least 1' }),
  limit: z
    .string()
    .optional()
    .default(String(APP_CONSTANTS.DEFAULT_PAGE_SIZE))
    .transform(Number)
    .refine((val) => val >= APP_CONSTANTS.MIN_PAGE_SIZE && val <= APP_CONSTANTS.MAX_PAGE_SIZE, {
      message: `Limit must be between ${APP_CONSTANTS.MIN_PAGE_SIZE} and ${APP_CONSTANTS.MAX_PAGE_SIZE}`,
    }),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * UUID/CUID ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export type IdParam = z.infer<typeof idParamSchema>;

/**
 * Email validation schema
 * Trims and lowercases before validating
 */
export const emailSchema = z.string().trim().toLowerCase().email('Invalid email format');

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(APP_CONSTANTS.PASSWORD_MIN_LENGTH, `Password must be at least ${APP_CONSTANTS.PASSWORD_MIN_LENGTH} characters`)
  .max(APP_CONSTANTS.PASSWORD_MAX_LENGTH, `Password must be at most ${APP_CONSTANTS.PASSWORD_MAX_LENGTH} characters`);

/**
 * Username validation schema
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

/**
 * Sort order schema
 */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
});

/**
 * Helper to create a validated request handler
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (data: unknown): z.infer<T> => {
    return schema.parse(data);
  };
}

/**
 * Helper to safely parse with default error handling
 */
export function safeParse<T extends z.ZodType>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

