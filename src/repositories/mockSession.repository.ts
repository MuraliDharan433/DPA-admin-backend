import { MockSessionModel, IMockSession } from '../models/MockSession.model';
import { paginate, type ListQuery } from '../utils/pagination';

export const mockSessionRepository = {
  findForStudent(studentId: string) {
    return MockSessionModel.find({ student: studentId })
      .populate('trainer', 'firstName lastName')
      .sort({ date: -1 });
  },

  findAll(query: ListQuery & { student?: string; trainer?: string; type?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.student) filter.student = query.student;
    if (query.trainer) filter.trainer = query.trainer;
    if (query.type) filter.type = query.type;
    return paginate<IMockSession>(
      MockSessionModel,
      filter,
      { ...query, sortBy: query.sortBy || 'date' },
      [{ path: 'student', populate: { path: 'course' } }, 'trainer'],
    );
  },

  findById(id: string) {
    return MockSessionModel.findById(id);
  },
  create(data: Partial<IMockSession>) {
    return MockSessionModel.create(data);
  },
  deleteById(id: string) {
    return MockSessionModel.deleteOne({ _id: id });
  },
};
