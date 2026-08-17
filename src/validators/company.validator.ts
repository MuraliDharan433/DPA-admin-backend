import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2).max(150),
  website: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(150).optional(),
  contactPerson: z.string().max(100).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();
