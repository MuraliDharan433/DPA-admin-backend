import { StudentModel, IStudent } from '../models/Student.model';
import { CounterModel } from '../models/Counter.model';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';

const STUDENT_ID_PREFIX = 'STU';
const STUDENT_ID_PAD = 5;

export const studentRepository = {
  async nextStudentId(): Promise<string> {
    const counter = await CounterModel.findOneAndUpdate(
      { key: 'student' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    return `${STUDENT_ID_PREFIX}-${String(counter.seq).padStart(STUDENT_ID_PAD, '0')}`;
  },

  findAll(query: ListQuery & { trainingStatus?: string; placementStatus?: string; course?: string; batch?: string }) {
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, ['firstName', 'lastName', 'email', 'mobile', 'studentId']),
    };
    if (query.trainingStatus) filter.trainingStatus = query.trainingStatus;
    if (query.placementStatus) filter.placementStatus = query.placementStatus;
    if (query.course) filter.course = query.course;
    if (query.batch) filter.batch = query.batch;
    return paginate<IStudent>(StudentModel, filter, query, ['course', 'batch']);
  },

  findById(id: string) {
    return StudentModel.findById(id).populate(['course', 'batch', 'createdBy', 'notes.createdBy']);
  },

  findByEmail(email: string) {
    return StudentModel.findOne({ email: email.toLowerCase() });
  },

  create(data: Partial<IStudent>) {
    return StudentModel.create(data);
  },

  deleteById(id: string) {
    return StudentModel.deleteOne({ _id: id });
  },

  countByFilter(filter: Record<string, unknown>) {
    return StudentModel.countDocuments(filter);
  },
};
