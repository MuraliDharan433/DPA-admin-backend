import { CourseModel, ICourse } from '../models/Course.model';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';
import { CourseStatus } from '../constants/enums.constant';

export const courseRepository = {
  findAll(query: ListQuery & { status?: string; mode?: string }) {
    const filter: Record<string, unknown> = { ...buildSearchFilter(query.search, ['name', 'code']) };
    if (query.status) filter.status = query.status;
    if (query.mode) filter.mode = query.mode;
    return paginate<ICourse>(CourseModel, filter, query);
  },
  findAllActive() {
    return CourseModel.find({ status: CourseStatus.ACTIVE }).sort({ name: 1 });
  },
  findById(id: string) {
    return CourseModel.findById(id);
  },
  findByCode(code: string) {
    return CourseModel.findOne({ code: code.toUpperCase() });
  },
  create(data: Partial<ICourse>) {
    return CourseModel.create(data);
  },
  deleteById(id: string) {
    return CourseModel.deleteOne({ _id: id });
  },
};
