import { Router } from 'express';
import { z } from 'zod';
import { InterviewModel, type IInterview } from '../models/Interview.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, type ListQuery } from '../utils/pagination';
import { paginationQuerySchema, mongoIdSchema } from '../utils/validation';
import { PERMISSIONS } from '../constants/permissions.constant';
import { InterviewStatus, InterviewResult } from '../constants/enums.constant';

// ---------------------------------------------------------------- validation

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

// ------------------------------------------------------------------- helpers

async function getInterviewOrFail(id: string) {
  const interview = await InterviewModel.findById(id).populate(['student', 'application']);
  if (!interview) throw ApiError.notFound('Interview not found');
  return interview;
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  validate(paginationQuerySchema.merge(queryInterviewSchema), 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery & {
      status?: string;
      result?: string;
      student?: string;
      application?: string;
    };
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.result) filter.result = query.result;
    if (query.student) filter.student = query.student;
    if (query.application) filter.application = query.application;

    const { data, pagination } = await paginate<IInterview>(
      InterviewModel,
      filter,
      { ...query, sortBy: query.sortBy || 'interviewDate' },
      ['student', 'application'],
    );
    return ok(res, 'Interviews fetched successfully', data, pagination);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'Interview fetched successfully', await getInterviewOrFail(req.params.id));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_CREATE),
  validate(createInterviewSchema),
  asyncHandler(async (req, res) => {
    const interview = await InterviewModel.create({ ...req.body, createdBy: req.user!.userId });
    return created(res, 'Interview scheduled successfully', interview);
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_EDIT),
  validate(updateInterviewSchema),
  asyncHandler(async (req, res) => {
    const interview = await getInterviewOrFail(req.params.id);
    Object.assign(interview, req.body);
    await interview.save();
    return ok(res, 'Interview updated successfully', interview);
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_DELETE),
  asyncHandler(async (req, res) => {
    await getInterviewOrFail(req.params.id);
    await InterviewModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Interview deleted successfully', null);
  }),
);

export default router;
