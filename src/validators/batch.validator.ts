import { z } from 'zod';
import { BatchStatus } from '../constants/enums.constant';
import { mongoIdSchema } from './common.validator';

export const createBatchSchema = z.object({
  name: z.string().min(2).max(120),
  course: mongoIdSchema,
  trainer: mongoIdSchema.optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  timing: z.string().max(60).optional(),
  capacity: z.number().int().min(1),
  status: z.nativeEnum(BatchStatus).optional(),
});

export const updateBatchSchema = createBatchSchema.partial();

export const queryBatchSchema = z.object({
  status: z.nativeEnum(BatchStatus).optional(),
  course: mongoIdSchema.optional(),
});
