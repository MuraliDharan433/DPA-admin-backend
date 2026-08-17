import { z } from 'zod';
import { EnquirySource, EnquiryStatus, FollowUpStatus } from '../constants/enums.constant';
import { mongoIdSchema } from './common.validator';

export const publicCreateEnquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  mobile: z.string().trim().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid mobile number'),
  course: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
  // Honeypot: hidden field on the public site's form - bots that fill every input trip it.
  website: z.string().optional(),
});

export const createEnquirySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  mobile: z.string().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid mobile number'),
  course: z.string().max(120).optional(),
  message: z.string().max(2000).optional(),
  source: z.nativeEnum(EnquirySource).optional(),
  status: z.nativeEnum(EnquiryStatus).optional(),
  assignedTo: mongoIdSchema.optional(),
});

export const updateEnquirySchema = createEnquirySchema.partial();

export const queryEnquirySchema = z.object({
  status: z.nativeEnum(EnquiryStatus).optional(),
  course: z.string().optional(),
  assignedTo: mongoIdSchema.optional(),
  source: z.nativeEnum(EnquirySource).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const assignEnquirySchema = z.object({
  assignedTo: mongoIdSchema,
});

export const updateEnquiryStatusSchema = z.object({
  status: z.nativeEnum(EnquiryStatus),
});

export const convertEnquirySchema = z.object({
  course: mongoIdSchema,
  batch: mongoIdSchema.optional(),
});

export const createFollowUpSchema = z.object({
  followUpDate: z.string().min(1),
  followUpTime: z.string().max(10).optional(),
  notes: z.string().max(2000).optional(),
  status: z.nativeEnum(FollowUpStatus).optional(),
  assignedUser: mongoIdSchema,
});

export const updateFollowUpSchema = createFollowUpSchema.partial();

export const queryFollowUpSchema = z.object({
  status: z.nativeEnum(FollowUpStatus).optional(),
  scope: z.enum(['today', 'overdue', 'upcoming']).optional(),
});
