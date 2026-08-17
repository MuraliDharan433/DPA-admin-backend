import { z } from 'zod';
import { JobApplicationStatus } from '../constants/enums.constant';
import { mongoIdSchema } from './common.validator';

export const createJobApplicationSchema = z.object({
  student: mongoIdSchema,
  company: mongoIdSchema,
  jobTitle: z.string().min(1).max(120),
  package: z.number().min(0).optional(),
  applicationDate: z.string().min(1),
  status: z.nativeEnum(JobApplicationStatus).optional(),
  offerDate: z.string().optional(),
  joiningDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateJobApplicationSchema = createJobApplicationSchema.partial();

export const queryJobApplicationSchema = z.object({
  status: z.nativeEnum(JobApplicationStatus).optional(),
  student: mongoIdSchema.optional(),
  company: mongoIdSchema.optional(),
});
