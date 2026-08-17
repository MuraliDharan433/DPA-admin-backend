import { z } from 'zod';
import { Gender, PlacementStatus, StudentType, TrainingStatus } from '../constants/enums.constant';
import { mongoIdSchema } from './common.validator';

const workHistoryEntrySchema = z.object({
  company: z.string().min(1).max(150),
  role: z.string().max(120).optional(),
  years: z.number().min(0).max(60).optional(),
});

export const createStudentSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  dob: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  email: z.string().email(),
  mobile: z.string().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid mobile number'),
  alternateMobile: z.string().regex(/^[0-9+\-\s()]{7,15}$/).optional().or(z.literal('')),
  address: z.string().max(250).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  pincode: z.string().max(12).optional(),
  highestQualification: z.string().max(120).optional(),
  college: z.string().max(150).optional(),
  university: z.string().max(150).optional(),
  graduationYear: z.number().int().min(1950).max(2100).optional(),
  percentage: z.number().min(0).max(100).optional(),
  skills: z.array(z.string()).optional(),
  course: mongoIdSchema,
  batch: mongoIdSchema.optional(),
  joiningDate: z.string().optional(),
  courseStartDate: z.string().optional(),
  courseEndDate: z.string().optional(),
  trainingStatus: z.nativeEnum(TrainingStatus).optional(),
  completedModules: z.array(z.string()).optional(),
  studentType: z.nativeEnum(StudentType).optional(),
  lastCompany: z.string().max(150).optional(),
  totalYearsExperience: z.number().min(0).max(60).optional(),
  pfStatus: z.boolean().optional(),
  workHistory: z.array(workHistoryEntrySchema).optional(),
  placementStatus: z.nativeEnum(PlacementStatus).optional(),
  currentCompany: z.string().max(150).optional(),
  jobTitle: z.string().max(120).optional(),
  package: z.number().min(0).optional(),
  placementDate: z.string().optional(),
  sourceEnquiry: mongoIdSchema.optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const queryStudentSchema = z.object({
  trainingStatus: z.nativeEnum(TrainingStatus).optional(),
  placementStatus: z.nativeEnum(PlacementStatus).optional(),
  course: mongoIdSchema.optional(),
  batch: mongoIdSchema.optional(),
});

export const addNoteSchema = z.object({
  text: z.string().min(1).max(2000),
});
