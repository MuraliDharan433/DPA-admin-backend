import { Router } from 'express';
import { z } from 'zod';
import { JobApplicationModel, type IJobApplication } from '../models/JobApplication.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, type ListQuery } from '../utils/pagination';
import { paginationQuerySchema, mongoIdSchema } from '../utils/validation';
import { PERMISSIONS } from '../constants/permissions.constant';
import {
  AuditAction,
  JobApplicationStatus,
  NotificationType,
  PlacementStatus,
} from '../constants/enums.constant';
import { RoleName } from '../constants/roles.constant';
import { updateStudent } from './student';
import { lookupUsersByRoleNames } from './user';
import { notifyUsers } from './notification';

// ---------------------------------------------------------------- validation

export const createJobApplicationSchema = z.object({
  student: mongoIdSchema,
  company: mongoIdSchema,
  jobTitle: z.string().min(1).max(120),
  package: z.number().min(0).optional(),
  applicationDate: z.string().min(1),
  status: z.nativeEnum(JobApplicationStatus).optional(),
  offerDate: z.string().optional(),
  joiningDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateJobApplicationSchema = createJobApplicationSchema.partial();

export const queryJobApplicationSchema = z.object({
  status: z.nativeEnum(JobApplicationStatus).optional(),
  student: mongoIdSchema.optional(),
  company: mongoIdSchema.optional(),
});

// ------------------------------------------------------------------- helpers

async function getApplicationOrFail(id: string) {
  const app = await JobApplicationModel.findById(id).populate(['student', 'company']);
  if (!app) throw ApiError.notFound('Job application not found');
  return app;
}

/** Keeps Student.placementStatus/currentCompany/jobTitle/package in sync with SELECTED/JOINED. */
async function syncStudentPlacement(applicationId: string) {
  const app = await JobApplicationModel.findById(applicationId).populate(['student', 'company']);
  if (!app) return;
  const company = app.company as unknown as { name: string };

  if (app.status === JobApplicationStatus.JOINED) {
    const student = await updateStudent(app.student.toString(), {
      placementStatus: PlacementStatus.PLACED,
      currentCompany: company?.name,
      jobTitle: app.jobTitle,
      package: app.package,
      placementDate: (app.joiningDate || app.offerDate)?.toISOString(),
    });

    const owners = await lookupUsersByRoleNames(RoleName.OWNER);
    await notifyUsers(
      owners.map((o: any) => String(o._id)),
      NotificationType.STUDENT_PLACED,
      'Student placed!',
      `${student.firstName} ${student.lastName} joined ${company?.name || 'a company'} as ${app.jobTitle}`,
      `/students/${student.id}`,
    );
  } else if (
    app.status === JobApplicationStatus.SELECTED ||
    app.status === JobApplicationStatus.OFFER_RECEIVED
  ) {
    await updateStudent(app.student.toString(), { placementStatus: PlacementStatus.INTERVIEWING });
  }
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  validate(paginationQuerySchema.merge(queryJobApplicationSchema), 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery & { status?: string; student?: string; company?: string };
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.student) filter.student = query.student;
    if (query.company) filter.company = query.company;

    const { data, pagination } = await paginate<IJobApplication>(JobApplicationModel, filter, query, [
      'student',
      'company',
    ]);
    return ok(res, 'Job applications fetched successfully', data, pagination);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'Job application fetched successfully', await getApplicationOrFail(req.params.id));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_CREATE),
  validate(createJobApplicationSchema),
  asyncHandler(async (req, res) => {
    const app = await JobApplicationModel.create({ ...req.body, createdBy: req.user!.userId });
    await syncStudentPlacement(app.id);
    return created(res, 'Job application created successfully', await getApplicationOrFail(app.id));
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_EDIT),
  validate(updateJobApplicationSchema),
  audit(AuditAction.PLACEMENT_UPDATED, 'placements'),
  asyncHandler(async (req, res) => {
    const app = await getApplicationOrFail(req.params.id);
    Object.assign(app, req.body);
    await app.save();
    await syncStudentPlacement(app.id);
    return ok(res, 'Job application updated successfully', await getApplicationOrFail(app.id));
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_DELETE),
  asyncHandler(async (req, res) => {
    await getApplicationOrFail(req.params.id);
    await JobApplicationModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Job application deleted successfully', null);
  }),
);

export default router;
