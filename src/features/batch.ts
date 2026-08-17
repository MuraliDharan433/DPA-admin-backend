import { Router } from 'express';
import { z } from 'zod';
import { BatchModel, type IBatch } from '../models/Batch.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';
import { paginationQuerySchema, mongoIdSchema } from '../utils/validation';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction, BatchStatus } from '../constants/enums.constant';

// ---------------------------------------------------------------- validation

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

// ------------------------------------------------------------------- helpers

export async function getBatchOrFail(id: string) {
  const batch = await BatchModel.findById(id).populate(['course', 'trainer']);
  if (!batch) throw ApiError.notFound('Batch not found');
  return batch;
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.BATCHES_VIEW),
  validate(paginationQuerySchema.merge(queryBatchSchema), 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery & { status?: string; course?: string };
    const filter: Record<string, unknown> = { ...buildSearchFilter(query.search, ['name']) };
    if (query.status) filter.status = query.status;
    if (query.course) filter.course = query.course;

    const { data, pagination } = await paginate<IBatch>(BatchModel, filter, query, ['course', 'trainer']);
    return ok(res, 'Batches fetched successfully', data, pagination);
  }),
);

router.get(
  '/active',
  requirePermissions(PERMISSIONS.BATCHES_VIEW),
  asyncHandler(async (_req, res) => {
    const batches = await BatchModel.find({ status: { $in: [BatchStatus.UPCOMING, BatchStatus.ACTIVE] } })
      .populate('course')
      .sort({ startDate: 1 });
    return ok(res, 'Active batches fetched successfully', batches);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.BATCHES_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'Batch fetched successfully', await getBatchOrFail(req.params.id));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.BATCHES_CREATE),
  validate(createBatchSchema),
  audit(AuditAction.BATCH_CREATED, 'batches'),
  asyncHandler(async (req, res) => {
    const batch = await BatchModel.create(req.body);
    return created(res, 'Batch created successfully', await getBatchOrFail(batch.id));
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.BATCHES_EDIT),
  validate(updateBatchSchema),
  audit(AuditAction.BATCH_UPDATED, 'batches'),
  asyncHandler(async (req, res) => {
    const batch = await getBatchOrFail(req.params.id);
    Object.assign(batch, req.body);
    await batch.save();
    return ok(res, 'Batch updated successfully', await getBatchOrFail(batch.id));
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.BATCHES_DELETE),
  audit(AuditAction.BATCH_DELETED, 'batches'),
  asyncHandler(async (req, res) => {
    await getBatchOrFail(req.params.id);
    await BatchModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Batch deleted successfully', null);
  }),
);

export default router;
