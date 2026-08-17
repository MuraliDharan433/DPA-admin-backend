import { BatchModel, IBatch } from '../models/Batch.model';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';

export const batchRepository = {
  findAll(query: ListQuery & { status?: string; course?: string }) {
    const filter: Record<string, unknown> = { ...buildSearchFilter(query.search, ['name']) };
    if (query.status) filter.status = query.status;
    if (query.course) filter.course = query.course;
    return paginate<IBatch>(BatchModel, filter, query, ['course', 'trainer']);
  },
  findAllActive() {
    return BatchModel.find({ status: { $in: ['UPCOMING', 'ACTIVE'] } }).populate('course').sort({ startDate: 1 });
  },
  findById(id: string) {
    return BatchModel.findById(id).populate(['course', 'trainer']);
  },
  create(data: Partial<IBatch>) {
    return BatchModel.create(data);
  },
  deleteById(id: string) {
    return BatchModel.deleteOne({ _id: id });
  },
};
