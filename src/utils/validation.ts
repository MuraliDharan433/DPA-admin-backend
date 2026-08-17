import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const paramsIdSchema = z.object({ id: mongoIdSchema });

/** Shared by auth (reset/change password) and user creation. */
export const strongPassword = z
  .string()
  .min(8)
  .max(72)
  .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Include upper, lower case letters and a number');
