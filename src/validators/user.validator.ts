import { z } from 'zod';
import { ALL_PERMISSIONS } from '../constants/permissions.constant';
import { UserStatus } from '../constants/enums.constant';
import { mongoIdSchema } from './common.validator';
import { strongPassword } from './auth.validator';

const permissionArray = z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).optional();

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  mobile: z.string().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid mobile number'),
  role: mongoIdSchema,
  password: strongPassword,
  status: z.nativeEnum(UserStatus).optional(),
  permissionGrants: permissionArray,
  permissionRevokes: permissionArray,
});

export const updateUserSchema = createUserSchema.omit({ password: true }).partial();

export const updatePermissionsSchema = z.object({
  grant: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])),
  revoke: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export const adminResetPasswordSchema = z.object({
  newPassword: strongPassword.optional(),
});
