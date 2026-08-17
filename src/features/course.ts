import { Router } from 'express';
import { z } from 'zod';
import { CourseModel, type ICourse } from '../models/Course.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';
import { paginationQuerySchema } from '../utils/validation';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction, CourseMode, CourseStatus } from '../constants/enums.constant';

// ---------------------------------------------------------------- validation

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

// ------------------------------------------------------------------- helpers
// Exported for other features that need to read courses (e.g. dashboard stats).

export async function getCourseOrFail(id: string) {
  const course = await CourseModel.findById(id);
  if (!course) throw ApiError.notFound('Course not found');
  return course;
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.COURSES_VIEW),
  validate(paginationQuerySchema.merge(queryCourseSchema), 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery & { status?: string; mode?: string };
    const filter: Record<string, unknown> = { ...buildSearchFilter(query.search, ['name', 'code']) };
    if (query.status) filter.status = query.status;
    if (query.mode) filter.mode = query.mode;

    const { data, pagination } = await paginate<ICourse>(CourseModel, filter, query);
    return ok(res, 'Courses fetched successfully', data, pagination);
  }),
);

router.get(
  '/active',
  requirePermissions(PERMISSIONS.COURSES_VIEW),
  asyncHandler(async (_req, res) => {
    const courses = await CourseModel.find({ status: CourseStatus.ACTIVE }).sort({ name: 1 });
    return ok(res, 'Active courses fetched successfully', courses);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.COURSES_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'Course fetched successfully', await getCourseOrFail(req.params.id));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.COURSES_CREATE),
  validate(createCourseSchema),
  audit(AuditAction.COURSE_CREATED, 'courses'),
  asyncHandler(async (req, res) => {
    const code = String(req.body.code).toUpperCase();
    if (await CourseModel.findOne({ code })) {
      throw ApiError.conflict('A course with this code already exists');
    }
    const course = await CourseModel.create({ ...req.body, code });
    return created(res, 'Course created successfully', course);
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.COURSES_EDIT),
  validate(updateCourseSchema),
  audit(AuditAction.COURSE_UPDATED, 'courses'),
  asyncHandler(async (req, res) => {
    const course = await getCourseOrFail(req.params.id);
    const code = req.body.code ? String(req.body.code).toUpperCase() : undefined;

    if (code && code !== course.code && (await CourseModel.findOne({ code }))) {
      throw ApiError.conflict('A course with this code already exists');
    }

    Object.assign(course, { ...req.body, ...(code ? { code } : {}) });
    await course.save();
    return ok(res, 'Course updated successfully', course);
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.COURSES_DELETE),
  audit(AuditAction.COURSE_DELETED, 'courses'),
  asyncHandler(async (req, res) => {
    await getCourseOrFail(req.params.id);
    await CourseModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Course deleted successfully', null);
  }),
);

export default router;
