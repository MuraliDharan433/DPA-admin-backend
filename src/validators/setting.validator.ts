import { z } from 'zod';

export const updateSettingSchema = z.object({
  instituteName: z.string().max(150).optional(),
  instituteEmail: z.string().email().optional().or(z.literal('')),
  institutePhone: z.string().max(30).optional(),
  instituteAddress: z.string().max(300).optional(),
});
