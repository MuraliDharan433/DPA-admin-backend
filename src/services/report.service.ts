import { StudentModel } from '../models/Student.model';
import { EnquiryModel } from '../models/Enquiry.model';
import { JobApplicationModel } from '../models/JobApplication.model';
import { toXlsx } from '../utils/xlsx';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { PERMISSIONS } from '../constants/permissions.constant';

function canSeeEnquiries(user: AuthenticatedUser): boolean {
  return user.roleName === 'OWNER' || user.permissions.includes(PERMISSIONS.ENQUIRIES_VIEW);
}

export const reportService = {
  async exportStudents(): Promise<Buffer> {
    const students = await StudentModel.find().populate(['course', 'batch']).lean();
    return toXlsx(
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
        createdAt: s.createdAt?.toISOString().slice(0, 10) || '',
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
  },

  async exportEnquiries(user: AuthenticatedUser): Promise<Buffer> {
    const filter = canSeeEnquiries(user) ? {} : { assignedTo: user.userId };
    const enquiries = await EnquiryModel.find(filter).populate('assignedTo').lean();
    return toXlsx(
      'Enquiries',
      enquiries.map((e: any) => ({
        name: e.name,
        email: e.email,
        mobile: e.mobile,
        course: e.course || '',
        status: e.status,
        source: e.source,
        assignedTo: e.assignedTo ? `${e.assignedTo.firstName} ${e.assignedTo.lastName}` : '',
        createdAt: e.createdAt?.toISOString().slice(0, 10) || '',
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
  },

  async exportPlacements(): Promise<Buffer> {
    const applications = await JobApplicationModel.find().populate(['student', 'company']).lean();
    return toXlsx(
      'Placements',
      applications.map((a: any) => ({
        student: a.student ? `${a.student.firstName} ${a.student.lastName}` : '',
        company: a.company?.name || '',
        jobTitle: a.jobTitle,
        package: a.package ?? '',
        applicationDate: a.applicationDate?.toISOString().slice(0, 10) || '',
        status: a.status,
        offerDate: a.offerDate?.toISOString().slice(0, 10) || '',
        joiningDate: a.joiningDate?.toISOString().slice(0, 10) || '',
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
  },
};
