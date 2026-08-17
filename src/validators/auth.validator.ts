import { z } from 'zod';

const strongPassword = z
  .string()
  .min(8)
  .max(72)
  .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Include upper, lower case letters and a number');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: strongPassword,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPassword,
});

export { strongPassword };
