import { InterviewModel, IInterview } from '../models/Interview.model';
import { paginate, type ListQuery } from '../utils/pagination';

export const interviewRepository = {
  findAll(query: ListQuery & { status?: string; result?: string; student?: string; application?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.result) filter.result = query.result;
    if (query.student) filter.student = query.student;
    if (query.application) filter.application = query.application;
    return paginate<IInterview>(
      InterviewModel,
      filter,
      { ...query, sortBy: query.sortBy || 'interviewDate' },
      ['student', 'application'],
    );
  },
  findById(id: string) {
    return InterviewModel.findById(id).populate(['student', 'application']);
  },
  create(data: Partial<IInterview>) {
    return InterviewModel.create(data);
  },
  deleteById(id: string) {
    return InterviewModel.deleteOne({ _id: id });
  },
};
