import { JobApplicationModel, IJobApplication } from '../models/JobApplication.model';
import { paginate, type ListQuery } from '../utils/pagination';

export const jobApplicationRepository = {
  findAll(query: ListQuery & { status?: string; student?: string; company?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.student) filter.student = query.student;
    if (query.company) filter.company = query.company;
    return paginate<IJobApplication>(JobApplicationModel, filter, query, ['student', 'company']);
  },
  findById(id: string) {
    return JobApplicationModel.findById(id).populate(['student', 'company']);
  },
  create(data: Partial<IJobApplication>) {
    return JobApplicationModel.create(data);
  },
  deleteById(id: string) {
    return JobApplicationModel.deleteOne({ _id: id });
  },
};
