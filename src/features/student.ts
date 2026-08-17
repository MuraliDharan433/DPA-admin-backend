import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { StudentModel, type IStudent } from '../models/Student.model';
import { CounterModel } from '../models/Counter.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';
import { paginationQuerySchema, mongoIdSchema } from '../utils/validation';
import { PERMISSIONS } from '../constants/permissions.constant';
import {
  AuditAction,
  Gender,
  PlacementStatus,
  StudentType,
  TrainingStatus,
} from '../constants/enums.constant';

const STUDENT_ID_PREFIX = 'STU';
const STUDENT_ID_PAD = 5;

// ---------------------------------------------------------------- validation

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
  totalFees: z.number().min(0).optional(),
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

export const addNoteSchema = z.object({ text: z.string().min(1).max(2000) });

export const addFeePaymentSchema = z.object({
  amount: z.number().min(0.01, 'Enter an amount'),
  term: z.string().max(60).optional(),
  account: z.string().max(80).optional(),
  paymentDate: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export type StudentInput = z.infer<typeof createStudentSchema>;

// ------------------------------------------------------------------- helpers

export async function getStudentOrFail(id: string) {
  // Staff references are populated name-only - a trainer may hold students.view without
  // users.view, so the full user document must not ride along inside a student payload.
  const staffFields = 'firstName lastName';

  const student = await StudentModel.findById(id).populate([
    { path: 'course' },
    { path: 'batch' },
    { path: 'createdBy', select: staffFields },
    { path: 'notes.createdBy', select: staffFields },
    { path: 'feePayments.recordedBy', select: staffFields },
  ]);
  if (!student) throw ApiError.notFound('Student not found');
  return student;
}

async function nextStudentId(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { key: 'student' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return `${STUDENT_ID_PREFIX}-${String(counter.seq).padStart(STUDENT_ID_PAD, '0')}`;
}

/** Shared with the placement sync in jobApplication and the enquiry->student conversion. */
export async function updateStudent(id: string, dto: Partial<StudentInput>) {
  const student = await getStudentOrFail(id);

  if (dto.email && dto.email.toLowerCase() !== student.email) {
    if (await StudentModel.findOne({ email: dto.email.toLowerCase() })) {
      throw ApiError.conflict('A student with this email already exists');
    }
  }

  const { completedModules, ...rest } = dto;
  Object.assign(student, { ...rest, ...(dto.email ? { email: dto.email.toLowerCase() } : {}) });

  if (completedModules) {
    // The client sends the desired set of completed class names; preserve the original
    // completion date for classes already marked done, and stamp "now" for newly-completed
    // ones, so re-saving the same list never resets its dates.
    const existingByName = new Map(student.completedModules.map((m) => [m.module, m.completedAt]));
    student.completedModules = completedModules.map((moduleName) => ({
      module: moduleName,
      completedAt: existingByName.get(moduleName) || new Date(),
    }));
  }

  await student.save();
  return getStudentOrFail(id);
}

/** Used by the enquiry -> student conversion flow. */
export async function createStudentFromEnquiry(
  data: Partial<StudentInput> & {
    email: string;
    firstName: string;
    lastName: string;
    mobile: string;
    course: string;
  },
  createdBy: string,
  sourceEnquiry: string,
) {
  const student = await StudentModel.create({
    ...data,
    studentId: await nextStudentId(),
    email: data.email.toLowerCase(),
    createdBy: new Types.ObjectId(createdBy),
    sourceEnquiry: new Types.ObjectId(sourceEnquiry),
  } as any);
  return getStudentOrFail(student.id);
}

export function countStudents(filter: Record<string, unknown>) {
  return StudentModel.countDocuments(filter);
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.STUDENTS_VIEW),
  validate(paginationQuerySchema.merge(queryStudentSchema), 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as ListQuery & {
      trainingStatus?: string;
      placementStatus?: string;
      course?: string;
      batch?: string;
    };
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, ['firstName', 'lastName', 'email', 'mobile', 'studentId']),
    };
    if (query.trainingStatus) filter.trainingStatus = query.trainingStatus;
    if (query.placementStatus) filter.placementStatus = query.placementStatus;
    if (query.course) filter.course = query.course;
    if (query.batch) filter.batch = query.batch;

    const { data, pagination } = await paginate<IStudent>(StudentModel, filter, query, ['course', 'batch']);
    return ok(res, 'Students fetched successfully', data, pagination);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.STUDENTS_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'Student fetched successfully', await getStudentOrFail(req.params.id));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.STUDENTS_CREATE),
  validate(createStudentSchema),
  audit(AuditAction.STUDENT_CREATED, 'students'),
  asyncHandler(async (req, res) => {
    if (await StudentModel.findOne({ email: String(req.body.email).toLowerCase() })) {
      throw ApiError.conflict('A student with this email already exists');
    }

    const student = await StudentModel.create({
      ...req.body,
      studentId: await nextStudentId(),
      email: String(req.body.email).toLowerCase(),
      createdBy: new Types.ObjectId(req.user!.userId),
    });

    return created(res, 'Student created successfully', await getStudentOrFail(student.id));
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.STUDENTS_EDIT),
  validate(updateStudentSchema),
  audit(AuditAction.STUDENT_UPDATED, 'students'),
  asyncHandler(async (req, res) => {
    return ok(res, 'Student updated successfully', await updateStudent(req.params.id, req.body));
  }),
);

router.post(
  '/:id/notes',
  requirePermissions(PERMISSIONS.STUDENTS_EDIT),
  validate(addNoteSchema),
  asyncHandler(async (req, res) => {
    const student = await getStudentOrFail(req.params.id);
    student.notes.push({
      text: req.body.text,
      createdBy: new Types.ObjectId(req.user!.userId),
      createdAt: new Date(),
    });
    await student.save();
    return ok(res, 'Note added successfully', await getStudentOrFail(req.params.id));
  }),
);

router.post(
  '/:id/fee-payments',
  requirePermissions(PERMISSIONS.STUDENTS_EDIT),
  validate(addFeePaymentSchema),
  asyncHandler(async (req, res) => {
    const student = await getStudentOrFail(req.params.id);

    student.feePayments.push({
      amount: req.body.amount,
      term: req.body.term,
      account: req.body.account,
      paymentDate: new Date(req.body.paymentDate),
      notes: req.body.notes,
      recordedBy: new Types.ObjectId(req.user!.userId),
      recordedAt: new Date(),
    });

    await student.save();
    return created(res, 'Fee payment recorded successfully', await getStudentOrFail(req.params.id));
  }),
);

router.delete(
  '/:id/fee-payments/:paymentId',
  requirePermissions(PERMISSIONS.STUDENTS_EDIT),
  asyncHandler(async (req, res) => {
    const student = await getStudentOrFail(req.params.id);
    const before = student.feePayments.length;

    student.feePayments = student.feePayments.filter(
      (p: any) => String(p._id) !== req.params.paymentId,
    ) as typeof student.feePayments;

    if (student.feePayments.length === before) throw ApiError.notFound('Fee payment not found');

    await student.save();
    return ok(res, 'Fee payment deleted successfully', await getStudentOrFail(req.params.id));
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.STUDENTS_DELETE),
  audit(AuditAction.STUDENT_DELETED, 'students'),
  asyncHandler(async (req, res) => {
    await getStudentOrFail(req.params.id);
    await StudentModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Student deleted successfully', null);
  }),
);

export default router;
