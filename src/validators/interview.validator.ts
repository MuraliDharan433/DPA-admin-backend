import { z } from 'zod';
import { InterviewStatus, InterviewResult } from '../constants/enums.constant';
import { mongoIdSchema } from './common.validator';

export const createInterviewSchema = z.object({
  application: mongoIdSchema,
  student: mongoIdSchema,
  interviewDate: z.string().min(1),
  round: z.string().max(60).optional(),
  status: z.nativeEnum(InterviewStatus).optional(),
  result: z.nativeEnum(InterviewResult).optional(),
  interviewer: z.string().max(150).optional(),
  feedback: z.string().max(2000).optional(),
});

export const updateInterviewSchema = createInterviewSchema.partial();

export const queryInterviewSchema = z.object({
  status: z.nativeEnum(InterviewStatus).optional(),
  result: z.nativeEnum(InterviewResult).optional(),
  student: mongoIdSchema.optional(),
  application: mongoIdSchema.optional(),
});
