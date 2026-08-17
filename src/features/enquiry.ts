import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { EnquiryModel, type IEnquiry } from '../models/Enquiry.model';
import { FollowUpModel, type IFollowUp } from '../models/FollowUp.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { publicEnquiryRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';
import { paginationQuerySchema, mongoIdSchema } from '../utils/validation';
import { logger } from '../utils/logger';
import { PERMISSIONS } from '../constants/permissions.constant';
import {
  AuditAction,
  EnquirySource,
  EnquiryStatus,
  FollowUpStatus,
  NotificationType,
} from '../constants/enums.constant';
import { RoleName } from '../constants/roles.constant';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { createStudentFromEnquiry } from './student';
import { lookupUsersByRoleNames } from './user';
import { notifyUsers } from './notification';

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- validation

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

export const assignEnquirySchema = z.object({ assignedTo: mongoIdSchema });
export const updateEnquiryStatusSchema = z.object({ status: z.nativeEnum(EnquiryStatus) });
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

// ------------------------------------------------------------------- helpers

/**
 * Enquiries are sensitive - Owner sees everything by default. The built-in COUNSELOR role is
 * always scoped to "assigned to me" regardless of holding enquiries.view (that permission just
 * lets them use the module at all). Anyone else Owner grants enquiries.view to (custom roles,
 * Admin, Staff) gets full visibility.
 */
function buildScopeFilter(user: AuthenticatedUser): Record<string, unknown> {
  if (user.roleName === RoleName.OWNER) return {};
  if (user.roleName === RoleName.COUNSELOR) return { assignedTo: new Types.ObjectId(user.userId) };
  return {};
}

async function getScopedEnquiryOrFail(id: string, user: AuthenticatedUser) {
  const enquiry = await EnquiryModel.findOne({ _id: id, ...buildScopeFilter(user) }).populate([
    'assignedTo',
    'createdBy',
  ]);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  return enquiry;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function touchLastFollowUp(enquiryId: string, date: Date) {
  return EnquiryModel.updateOne({ _id: enquiryId }, { $set: { lastFollowUpAt: date } });
}

// ------------------------------------------------------------- enquiry routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.ENQUIRIES_VIEW),
  validate(paginationQuerySchema.merge(queryEnquirySchema), 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery & {
      status?: string;
      course?: string;
      assignedTo?: string;
      source?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const filter: Record<string, unknown> = {
      ...buildScopeFilter(req.user!),
      ...buildSearchFilter(query.search, ['name', 'email', 'mobile']),
    };
    if (query.status) filter.status = query.status;
    if (query.course) filter.course = new RegExp(escapeRegex(query.course), 'i');
    if (query.assignedTo) filter.assignedTo = query.assignedTo;
    if (query.source) filter.source = query.source;
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {
        ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
      };
    }

    const { data, pagination } = await paginate<IEnquiry>(EnquiryModel, filter, query, [
      'assignedTo',
      'createdBy',
    ]);
    return ok(res, 'Enquiries fetched successfully', data, pagination);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.ENQUIRIES_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'Enquiry fetched successfully', await getScopedEnquiryOrFail(req.params.id, req.user!));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.ENQUIRIES_CREATE),
  validate(createEnquirySchema),
  audit(AuditAction.ENQUIRY_CREATED, 'enquiries'),
  asyncHandler(async (req, res) => {
    const enquiry = await EnquiryModel.create({
      ...req.body,
      email: String(req.body.email).toLowerCase(),
      source: req.body.source || EnquirySource.WALK_IN,
      createdBy: new Types.ObjectId(req.user!.userId),
    });
    return created(res, 'Enquiry created successfully', enquiry);
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  validate(updateEnquirySchema),
  audit(AuditAction.ENQUIRY_UPDATED, 'enquiries'),
  asyncHandler(async (req, res) => {
    const enquiry = await getScopedEnquiryOrFail(req.params.id, req.user!);
    Object.assign(enquiry, {
      ...req.body,
      ...(req.body.email ? { email: String(req.body.email).toLowerCase() } : {}),
    });
    await enquiry.save();
    return ok(res, 'Enquiry updated successfully', enquiry);
  }),
);

router.patch(
  '/:id/status',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  validate(updateEnquiryStatusSchema),
  asyncHandler(async (req, res) => {
    const enquiry = await getScopedEnquiryOrFail(req.params.id, req.user!);
    enquiry.status = req.body.status;
    await enquiry.save();
    return ok(res, 'Enquiry status updated successfully', enquiry);
  }),
);

router.patch(
  '/:id/assign',
  requirePermissions(PERMISSIONS.ENQUIRIES_ASSIGN),
  validate(assignEnquirySchema),
  audit(AuditAction.ENQUIRY_ASSIGNED, 'enquiries'),
  asyncHandler(async (req, res) => {
    const enquiry = await EnquiryModel.findById(req.params.id);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');

    enquiry.assignedTo = new Types.ObjectId(String(req.body.assignedTo));
    if (enquiry.status === EnquiryStatus.NEW) enquiry.status = EnquiryStatus.CONTACTED;
    await enquiry.save();

    await notifyUsers(
      [String(req.body.assignedTo)],
      NotificationType.ENQUIRY_ASSIGNED,
      'Enquiry assigned to you',
      `${enquiry.name} - ${enquiry.course || 'General enquiry'}`,
      `/enquiries/${enquiry.id}`,
    );

    return ok(res, 'Enquiry assigned successfully', enquiry);
  }),
);

router.post(
  '/:id/convert',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT, PERMISSIONS.STUDENTS_CREATE),
  validate(convertEnquirySchema),
  asyncHandler(async (req, res) => {
    const enquiry = await getScopedEnquiryOrFail(req.params.id, req.user!);
    if (enquiry.convertedToStudent) {
      throw ApiError.badRequest('This enquiry has already been converted to a student');
    }

    const [firstName, ...rest] = enquiry.name.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName;

    const student = await createStudentFromEnquiry(
      {
        firstName,
        lastName,
        email: enquiry.email,
        mobile: enquiry.mobile,
        course: req.body.course,
        batch: req.body.batch,
      },
      req.user!.userId,
      enquiry.id,
    );

    enquiry.convertedToStudent = student._id as Types.ObjectId;
    enquiry.status = EnquiryStatus.CONVERTED;
    await enquiry.save();

    return ok(res, 'Enquiry converted to student successfully', { enquiry, studentId: student.id });
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.ENQUIRIES_DELETE),
  audit(AuditAction.ENQUIRY_DELETED, 'enquiries'),
  asyncHandler(async (req, res) => {
    const enquiry = await EnquiryModel.findById(req.params.id);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    await EnquiryModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Enquiry deleted successfully', null);
  }),
);

router.get(
  '/:id/follow-ups',
  requirePermissions(PERMISSIONS.ENQUIRIES_VIEW),
  asyncHandler(async (req, res) => {
    const followUps = await FollowUpModel.find({ enquiry: req.params.id })
      .populate('assignedUser')
      .sort({ followUpDate: -1 });
    return ok(res, 'Follow-ups fetched successfully', followUps);
  }),
);

router.post(
  '/:id/follow-ups',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  validate(createFollowUpSchema),
  asyncHandler(async (req, res) => {
    const followUp = await FollowUpModel.create({
      ...req.body,
      enquiry: new Types.ObjectId(req.params.id),
      createdBy: new Types.ObjectId(req.user!.userId),
    });
    await touchLastFollowUp(req.params.id, new Date(req.body.followUpDate));
    return created(res, 'Follow-up added successfully', followUp);
  }),
);

// ----------------------------------------------------------- follow-up routes
// Mounted separately at /follow-ups, but lives here because it reuses the enquiry
// visibility scoping above.

export const followUpRouter = Router();
followUpRouter.use(requireAuth);

followUpRouter.get(
  '/',
  requirePermissions(PERMISSIONS.ENQUIRIES_VIEW),
  validate(paginationQuerySchema.merge(queryFollowUpSchema), 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery & { status?: string; scope?: 'today' | 'overdue' | 'upcoming' };

    const filter: Record<string, unknown> = {};

    // Restrict to follow-ups on enquiries this user can see (no-op for Owner/Admin).
    const scopeFilter = buildScopeFilter(req.user!);
    if (Object.keys(scopeFilter).length > 0) {
      const visible = await EnquiryModel.find(scopeFilter).select('_id').lean();
      filter.enquiry = { $in: visible.map((e) => e._id) };
    }

    if (query.status) filter.status = query.status;

    const now = new Date();
    if (query.scope === 'today') {
      filter.followUpDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
      filter.status = FollowUpStatus.PENDING;
    } else if (query.scope === 'overdue') {
      filter.followUpDate = { $lt: startOfDay(now) };
      filter.status = FollowUpStatus.PENDING;
    } else if (query.scope === 'upcoming') {
      filter.followUpDate = { $gt: endOfDay(now) };
      filter.status = FollowUpStatus.PENDING;
    }

    const { data, pagination } = await paginate<IFollowUp>(
      FollowUpModel,
      filter,
      { ...query, sortBy: query.sortBy || 'followUpDate' },
      ['enquiry', 'assignedUser'],
    );
    return ok(res, 'Follow-ups fetched successfully', data, pagination);
  }),
);

followUpRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  validate(updateFollowUpSchema),
  asyncHandler(async (req, res) => {
    const followUp = await FollowUpModel.findById(req.params.id);
    if (!followUp) throw ApiError.notFound('Follow-up not found');

    Object.assign(followUp, req.body);
    await followUp.save();

    if (req.body.followUpDate) {
      await touchLastFollowUp(followUp.enquiry.toString(), new Date(req.body.followUpDate));
    }
    return ok(res, 'Follow-up updated successfully', followUp);
  }),
);

followUpRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  asyncHandler(async (req, res) => {
    const followUp = await FollowUpModel.findById(req.params.id);
    if (!followUp) throw ApiError.notFound('Follow-up not found');
    await FollowUpModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Follow-up deleted successfully', null);
  }),
);

// ------------------------------------------------------ public enquiry routes
// No requireAuth by design - this is the endpoint the static institute website's
// enquiry form posts to. Protected only by validation + rate limiting.

export const publicEnquiryRouter = Router();

publicEnquiryRouter.post(
  '/',
  publicEnquiryRateLimiter,
  validate(publicCreateEnquirySchema),
  asyncHandler(async (req, res) => {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

    // Silently no-op on honeypot fill (bot) or a duplicate within 24h, without revealing
    // that distinction back to the caller.
    const isBot = req.body.website && String(req.body.website).trim().length > 0;
    if (isBot) {
      logger.warn(`Honeypot triggered from IP ${ipAddress} - likely bot, dropped silently`);
    } else {
      const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
      const duplicate = await EnquiryModel.findOne({
        $or: [{ email: String(req.body.email).toLowerCase() }, { mobile: req.body.mobile }],
        createdAt: { $gte: since },
      });

      if (duplicate) {
        logger.log(`Duplicate enquiry suppressed for ${req.body.email} within 24h window`);
      } else {
        const enquiry = await EnquiryModel.create({
          name: req.body.name,
          email: String(req.body.email).toLowerCase(),
          mobile: req.body.mobile,
          course: req.body.course,
          message: req.body.message,
          source: EnquirySource.WEBSITE,
          status: EnquiryStatus.NEW,
          ipAddress,
        });

        const owners = await lookupUsersByRoleNames(RoleName.OWNER);
        await notifyUsers(
          owners.map((o: any) => String(o._id)),
          NotificationType.NEW_ENQUIRY,
          'New enquiry received',
          `${enquiry.name} enquired about ${enquiry.course || 'a course'}`,
          `/enquiries/${enquiry.id}`,
        );
      }
    }

    return created(res, 'Thank you! We have received your enquiry and will get in touch soon.', null);
  }),
);

export default router;
