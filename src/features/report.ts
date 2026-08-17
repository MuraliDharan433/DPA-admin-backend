import { Router, type Response } from 'express';
import { StudentModel } from '../models/Student.model';
import { EnquiryModel } from '../models/Enquiry.model';
import { JobApplicationModel } from '../models/JobApplication.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { toXlsx } from '../utils/xlsx';
import { PERMISSIONS } from '../constants/permissions.constant';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

// ------------------------------------------------------------------- helpers

function canSeeAllEnquiries(user: AuthenticatedUser): boolean {
  return user.roleName === 'OWNER' || user.permissions.includes(PERMISSIONS.ENQUIRIES_VIEW);
}

function sendXlsx(res: Response, filename: string, buffer: Buffer) {
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(buffer);
}

const day = (d?: Date) => d?.toISOString().slice(0, 10) || '';

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);
router.use(requirePermissions(PERMISSIONS.REPORTS_VIEW));

router.get(
  '/students/export',
  asyncHandler(async (_req, res) => {
    const students = await StudentModel.find().populate(['course', 'batch']).lean();

    const buffer = await toXlsx(
      'Students',
      students.map((s: any) => ({
        studentId: s.studentId,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        mobile: s.mobile,
        course: s.course?.name || '',
        batch: s.batch?.name || '',
        trainingStatus: s.trainingStatus,
        placementStatus: s.placementStatus,
        currentCompany: s.currentCompany || '',
        package: s.package ?? '',
        createdAt: day(s.createdAt),
      })),
      [
        { key: 'studentId', header: 'Student ID', width: 14 },
        { key: 'name', header: 'Name', width: 22 },
        { key: 'email', header: 'Email', width: 26 },
        { key: 'mobile', header: 'Mobile', width: 16 },
        { key: 'course', header: 'Course', width: 22 },
        { key: 'batch', header: 'Batch', width: 20 },
        { key: 'trainingStatus', header: 'Training Status', width: 16 },
        { key: 'placementStatus', header: 'Placement Status', width: 18 },
        { key: 'currentCompany', header: 'Current Company', width: 20 },
        { key: 'package', header: 'Package', width: 12 },
        { key: 'createdAt', header: 'Created At', width: 14 },
      ],
    );

    sendXlsx(res, `students-${Date.now()}.xlsx`, buffer);
  }),
);

router.get(
  '/enquiries/export',
  asyncHandler(async (req, res) => {
    const filter = canSeeAllEnquiries(req.user!) ? {} : { assignedTo: req.user!.userId };
    const enquiries = await EnquiryModel.find(filter).populate('assignedTo').lean();

    const buffer = await toXlsx(
      'Enquiries',
      enquiries.map((e: any) => ({
        name: e.name,
        email: e.email,
        mobile: e.mobile,
        course: e.course || '',
        status: e.status,
        source: e.source,
        assignedTo: e.assignedTo ? `${e.assignedTo.firstName} ${e.assignedTo.lastName}` : '',
        createdAt: day(e.createdAt),
      })),
      [
        { key: 'name', header: 'Name', width: 22 },
        { key: 'email', header: 'Email', width: 26 },
        { key: 'mobile', header: 'Mobile', width: 16 },
        { key: 'course', header: 'Course', width: 22 },
        { key: 'status', header: 'Status', width: 16 },
        { key: 'source', header: 'Source', width: 14 },
        { key: 'assignedTo', header: 'Assigned To', width: 20 },
        { key: 'createdAt', header: 'Created At', width: 14 },
      ],
    );

    sendXlsx(res, `enquiries-${Date.now()}.xlsx`, buffer);
  }),
);

router.get(
  '/placements/export',
  asyncHandler(async (_req, res) => {
    const applications = await JobApplicationModel.find().populate(['student', 'company']).lean();

    const buffer = await toXlsx(
      'Placements',
      applications.map((a: any) => ({
        student: a.student ? `${a.student.firstName} ${a.student.lastName}` : '',
        company: a.company?.name || '',
        jobTitle: a.jobTitle,
        package: a.package ?? '',
        applicationDate: day(a.applicationDate),
        status: a.status,
        offerDate: day(a.offerDate),
        joiningDate: day(a.joiningDate),
      })),
      [
        { key: 'student', header: 'Student', width: 22 },
        { key: 'company', header: 'Company', width: 22 },
        { key: 'jobTitle', header: 'Job Title', width: 22 },
        { key: 'package', header: 'Package', width: 12 },
        { key: 'applicationDate', header: 'Application Date', width: 16 },
        { key: 'status', header: 'Status', width: 16 },
        { key: 'offerDate', header: 'Offer Date', width: 14 },
        { key: 'joiningDate', header: 'Joining Date', width: 14 },
      ],
    );

    sendXlsx(res, `placements-${Date.now()}.xlsx`, buffer);
  }),
);

export default router;
