import { jobApplicationRepository } from '../repositories/jobApplication.repository';
import { studentService } from './student.service';
import { userService } from './user.service';
import { notificationService } from './notification.service';
import { ApiError } from '../utils/apiResponse';
import type { ListQuery } from '../utils/pagination';
import { JobApplicationStatus, NotificationType, PlacementStatus } from '../constants/enums.constant';
import { RoleName } from '../constants/roles.constant';

export interface JobApplicationInput {
  student: string;
  company: string;
  jobTitle: string;
  package?: number;
  applicationDate: string;
  status?: JobApplicationStatus;
  offerDate?: string;
  joiningDate?: string;
  notes?: string;
}

export const jobApplicationService = {
  findAll(query: ListQuery & { status?: string; student?: string; company?: string }) {
    return jobApplicationRepository.findAll(query);
  },

  async findById(id: string) {
    const app = await jobApplicationRepository.findById(id);
    if (!app) throw ApiError.notFound('Job application not found');
    return app;
  },

  async create(dto: JobApplicationInput, createdBy: string) {
    const app = await jobApplicationRepository.create({ ...dto, createdBy } as any);
    await this.syncStudentPlacement(app.id);
    return this.findById(app.id);
  },

  async update(id: string, dto: Partial<JobApplicationInput>) {
    const app = await jobApplicationRepository.findById(id);
    if (!app) throw ApiError.notFound('Job application not found');
    Object.assign(app, dto);
    await app.save();
    await this.syncStudentPlacement(app.id);
    return this.findById(app.id);
  },

  async delete(id: string) {
    const app = await jobApplicationRepository.findById(id);
    if (!app) throw ApiError.notFound('Job application not found');
    await jobApplicationRepository.deleteById(id);
  },

  /** Keeps Student.placementStatus/currentCompany/jobTitle/package in sync with SELECTED/JOINED. */
  async syncStudentPlacement(applicationId: string) {
    const app = await jobApplicationRepository.findById(applicationId);
    if (!app) return;
    const company = app.company as unknown as { name: string };

    if (app.status === JobApplicationStatus.JOINED) {
      const student = await studentService.update(app.student.toString(), {
        placementStatus: PlacementStatus.PLACED,
        currentCompany: company?.name,
        jobTitle: app.jobTitle,
        package: app.package,
        placementDate: (app.joiningDate || app.offerDate)?.toISOString(),
      });

      const owners = await userService.lookupByRoleName(RoleName.OWNER);
      await notificationService.createForUsers(
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
      await studentService.update(app.student.toString(), { placementStatus: PlacementStatus.INTERVIEWING });
    }
  },
};
