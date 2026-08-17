import { z } from 'zod';
import { ALL_PERMISSIONS } from '../constants/permissions.constant';

export const createRoleSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(255).optional(),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])),
});

export const updateRoleSchema = createRoleSchema.partial();
