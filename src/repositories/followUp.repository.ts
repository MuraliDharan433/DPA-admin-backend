import { FollowUpModel, IFollowUp } from '../models/FollowUp.model';
import { paginate, type ListQuery } from '../utils/pagination';

export const followUpRepository = {
  findForEnquiry(enquiryId: string) {
    return FollowUpModel.find({ enquiry: enquiryId }).populate('assignedUser').sort({ followUpDate: -1 });
  },
  findById(id: string) {
    return FollowUpModel.findById(id);
  },
  create(data: Partial<IFollowUp>) {
    return FollowUpModel.create(data);
  },
  deleteById(id: string) {
    return FollowUpModel.deleteOne({ _id: id });
  },
  paginate(filter: Record<string, unknown>, query: ListQuery) {
    return paginate<IFollowUp>(FollowUpModel, filter, query, ['enquiry', 'assignedUser']);
  },
};
