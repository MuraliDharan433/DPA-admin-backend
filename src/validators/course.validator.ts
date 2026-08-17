import { z } from 'zod';
import { CourseMode, CourseStatus } from '../constants/enums.constant';

export const createCourseSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(20),
  description: z.string().max(2000).optional(),
  duration: z.string().min(1).max(60),
  fee: z.number().min(0),
  mode: z.nativeEnum(CourseMode),
  status: z.nativeEnum(CourseStatus).optional(),
  modules: z.array(z.string().min(1).max(80)).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const queryCourseSchema = z.object({
  status: z.nativeEnum(CourseStatus).optional(),
  mode: z.nativeEnum(CourseMode).optional(),
});
