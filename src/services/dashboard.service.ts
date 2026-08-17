import { StudentModel } from '../models/Student.model';
import { EnquiryModel } from '../models/Enquiry.model';
import { FollowUpModel } from '../models/FollowUp.model';
import { CourseModel } from '../models/Course.model';
import { BatchModel } from '../models/Batch.model';
import { ResumeModel } from '../models/Resume.model';
import { UserModel } from '../models/User.model';
import { JobApplicationModel } from '../models/JobApplication.model';
import {
  CourseStatus,
  BatchStatus,
  TrainingStatus,
  PlacementStatus,
  EnquiryStatus,
  FollowUpStatus,
  JobApplicationStatus,
} from '../constants/enums.constant';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { PERMISSIONS } from '../constants/permissions.constant';

function canSeeEnquiries(user: AuthenticatedUser): boolean {
  return user.roleName === 'OWNER' || user.permissions.includes(PERMISSIONS.ENQUIRIES_VIEW);
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTrend(rows: { _id: { year: number; month: number }; count: number }[]) {
  return rows.map((r) => ({ label: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`, count: r.count }));
}

export const dashboardService = {
  async getStats(user: AuthenticatedUser) {
    const enquiriesVisible = canSeeEnquiries(user);

    const [
      totalStudents,
      activeStudents,
      activeCourses,
      activeBatches,
      studentsLookingForJobs,
      placedStudents,
      newEnquiries,
      pendingFollowUps,
    ] = await Promise.all([
      StudentModel.countDocuments(),
      StudentModel.countDocuments({ trainingStatus: TrainingStatus.ACTIVE }),
      CourseModel.countDocuments({ status: CourseStatus.ACTIVE }),
      BatchModel.countDocuments({ status: BatchStatus.ACTIVE }),
      StudentModel.countDocuments({ placementStatus: PlacementStatus.LOOKING_FOR_JOB }),
      StudentModel.countDocuments({ placementStatus: PlacementStatus.PLACED }),
      enquiriesVisible ? EnquiryModel.countDocuments({ status: EnquiryStatus.NEW }) : null,
      enquiriesVisible ? FollowUpModel.countDocuments({ status: FollowUpStatus.PENDING }) : null,
    ]);

    return {
      totalStudents,
      activeStudents,
      activeCourses,
      activeBatches,
      studentsLookingForJobs,
      placedStudents,
      newEnquiries,
      pendingFollowUps,
    };
  },

  async getCharts(user: AuthenticatedUser) {
    const enquiriesVisible = canSeeEnquiries(user);
    const since = monthsAgo(5);

    const [enrollmentTrend, courseWise, placementStats, enquiryConversion, monthlyEnquiries] = await Promise.all([
      StudentModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      StudentModel.aggregate([
        { $group: { _id: '$course', count: { $sum: 1 } } },
        { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, course: { $ifNull: ['$course.name', 'Unassigned'] }, count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      StudentModel.aggregate([
        { $group: { _id: '$placementStatus', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ]),
      enquiriesVisible
        ? EnquiryModel.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
          ])
        : null,
      enquiriesVisible
        ? EnquiryModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ])
        : null,
    ]);

    return {
      studentEnrollmentTrend: formatTrend(enrollmentTrend),
      courseWiseStudents: courseWise,
      placementStatistics: placementStats,
      enquiryConversion,
      monthlyEnquiries: monthlyEnquiries ? formatTrend(monthlyEnquiries) : null,
    };
  },

  async getRecentActivity(user: AuthenticatedUser) {
    const enquiriesVisible = canSeeEnquiries(user);

    const [students, enquiries, resumes, placements, users] = await Promise.all([
      StudentModel.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName createdAt').lean(),
      enquiriesVisible
        ? EnquiryModel.find().sort({ createdAt: -1 }).limit(5).select('name createdAt').lean()
        : [],
      ResumeModel.find().sort({ createdAt: -1 }).limit(5).populate('student', 'firstName lastName').lean(),
      JobApplicationModel.find({ status: JobApplicationStatus.JOINED })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('student', 'firstName lastName')
        .lean(),
      UserModel.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName createdAt').lean(),
    ]);

    const events = [
      ...students.map((s: any) => ({
        type: 'STUDENT_ADDED',
        message: `${s.firstName} ${s.lastName} was added as a new student`,
        timestamp: s.createdAt,
      })),
      ...enquiries.map((e: any) => ({
        type: 'NEW_ENQUIRY',
        message: `New enquiry from ${e.name}`,
        timestamp: e.createdAt,
      })),
      ...resumes.map((r: any) => ({
        type: 'RESUME_UPLOADED',
        message: `Resume uploaded for ${r.student ? `${r.student.firstName} ${r.student.lastName}` : 'a student'}`,
        timestamp: r.createdAt,
      })),
      ...placements.map((p: any) => ({
        type: 'STUDENT_PLACED',
        message: `${p.student ? `${p.student.firstName} ${p.student.lastName}` : 'A student'} was placed`,
        timestamp: p.updatedAt,
      })),
      ...users.map((u: any) => ({
        type: 'USER_CREATED',
        message: `${u.firstName} ${u.lastName} was added as a system user`,
        timestamp: u.createdAt,
      })),
    ];

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  },
};
