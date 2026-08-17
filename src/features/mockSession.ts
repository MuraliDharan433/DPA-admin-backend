import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { MockSessionModel, MockSessionType, type IMockSession } from '../models/MockSession.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, type ListQuery } from '../utils/pagination';
import { paginationQuerySchema, mongoIdSchema } from '../utils/validation';
import { PERMISSIONS } from '../constants/permissions.constant';

// ---------------------------------------------------------------- validation

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

// ------------------------------------------------------------------- helpers

async function getMockSessionOrFail(id: string) {
  const session = await MockSessionModel.findById(id);
  if (!session) throw ApiError.notFound('Mock session not found');
  return session;
}

// -------------------------------------------------------------------- routes
// Note: this router is mounted at '/' because it owns both the top-level
// /mock-sessions paths and the nested /students/:studentId/mock-sessions ones.

const router = Router();
router.use(requireAuth);

router.get(
  '/mock-sessions',
  requirePermissions(PERMISSIONS.MOCK_VIEW),
  validate(paginationQuerySchema.merge(queryMockSessionSchema), 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery & { student?: string; trainer?: string; type?: string };
    const filter: Record<string, unknown> = {};
    if (query.student) filter.student = query.student;
    if (query.trainer) filter.trainer = query.trainer;
    if (query.type) filter.type = query.type;

    const { data, pagination } = await paginate<IMockSession>(
      MockSessionModel,
      filter,
      { ...query, sortBy: query.sortBy || 'date' },
      [{ path: 'student', populate: { path: 'course' } }, 'trainer'],
    );
    return ok(res, 'Mock sessions fetched successfully', data, pagination);
  }),
);

router.post(
  '/mock-sessions',
  requirePermissions(PERMISSIONS.MOCK_CREATE),
  validate(createGeneralMockSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await MockSessionModel.create({
      ...req.body,
      date: new Date(req.body.date),
      student: new Types.ObjectId(String(req.body.student)),
      trainer: new Types.ObjectId(String(req.body.trainer)),
      createdBy: new Types.ObjectId(req.user!.userId),
    });
    return created(res, 'Mock session added successfully', session);
  }),
);

router.patch(
  '/mock-sessions/:id',
  requirePermissions(PERMISSIONS.MOCK_EDIT),
  validate(updateMockSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await getMockSessionOrFail(req.params.id);
    Object.assign(session, req.body);
    await session.save();
    return ok(res, 'Mock session updated successfully', session);
  }),
);

router.delete(
  '/mock-sessions/:id',
  requirePermissions(PERMISSIONS.MOCK_DELETE),
  asyncHandler(async (req, res) => {
    await getMockSessionOrFail(req.params.id);
    await MockSessionModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Mock session deleted successfully', null);
  }),
);

router.get(
  '/students/:studentId/mock-sessions',
  requirePermissions(PERMISSIONS.MOCK_VIEW),
  asyncHandler(async (req, res) => {
    const sessions = await MockSessionModel.find({ student: req.params.studentId })
      .populate('trainer', 'firstName lastName')
      .sort({ date: -1 });
    return ok(res, 'Mock sessions fetched successfully', sessions);
  }),
);

router.post(
  '/students/:studentId/mock-sessions',
  requirePermissions(PERMISSIONS.MOCK_CREATE),
  validate(createMockSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await MockSessionModel.create({
      ...req.body,
      date: new Date(req.body.date),
      student: new Types.ObjectId(req.params.studentId),
      trainer: new Types.ObjectId(String(req.body.trainer)),
      createdBy: new Types.ObjectId(req.user!.userId),
    });
    return created(res, 'Mock session added successfully', session);
  }),
);

export default router;
