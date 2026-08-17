import { Types } from 'mongoose';
import { EnquiryModel, IEnquiry } from '../models/Enquiry.model';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';

export const enquiryRepository = {
  findAll(
    scopeFilter: Record<string, unknown>,
    query: ListQuery & {
      status?: string;
      course?: string;
      assignedTo?: string;
      source?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const filter: Record<string, unknown> = {
      ...scopeFilter,
      ...buildSearchFilter(query.search, ['name', 'email', 'mobile']),
    };
    if (query.status) filter.status = query.status;
    if (query.course) filter.course = new RegExp(escapeRegex(query.course), 'i');
    if (query.assignedTo) filter.assignedTo = query.assignedTo;
    if (query.source) filter.source = query.source;
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {
        ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
      };
    }
    return paginate<IEnquiry>(EnquiryModel, filter, query, ['assignedTo', 'createdBy']);
  },

  findOneScoped(id: string, scopeFilter: Record<string, unknown>) {
    return EnquiryModel.findOne({ _id: id, ...scopeFilter }).populate(['assignedTo', 'createdBy']);
  },

  findByIdRaw(id: string) {
    return EnquiryModel.findById(id);
  },

  findDuplicate(email: string, mobile: string, since: Date) {
    return EnquiryModel.findOne({ $or: [{ email }, { mobile }], createdAt: { $gte: since } });
  },

  create(data: Partial<IEnquiry>) {
    return EnquiryModel.create(data);
  },

  deleteById(id: string) {
    return EnquiryModel.deleteOne({ _id: id });
  },

  touchLastFollowUp(enquiryId: string, date: Date) {
    return EnquiryModel.updateOne({ _id: enquiryId }, { $set: { lastFollowUpAt: date } });
  },

  findVisibleIds(scopeFilter: Record<string, unknown>) {
    return EnquiryModel.find(scopeFilter).select('_id').lean();
  },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
