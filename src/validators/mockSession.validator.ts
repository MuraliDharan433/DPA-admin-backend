import { z } from 'zod';
import { MockSessionType } from '../models/MockSession.model';
import { mongoIdSchema } from './common.validator';

export const createMockSessionSchema = z.object({
  type: z.nativeEnum(MockSessionType),
  date: z.string().min(1),
  trainer: mongoIdSchema,
  feedback: z.string().max(2000).optional(),
  rating: z.number().int().min(1).max(5),
});

export const updateMockSessionSchema = createMockSessionSchema.partial();

export const createGeneralMockSessionSchema = createMockSessionSchema.extend({
  student: mongoIdSchema,
});

export const queryMockSessionSchema = z.object({
  student: mongoIdSchema.optional(),
  trainer: mongoIdSchema.optional(),
  type: z.nativeEnum(MockSessionType).optional(),
});
