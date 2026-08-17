import { Types } from 'mongoose';
import { followUpRepository } from '../repositories/followUp.repository';
import { enquiryService } from './enquiry.service';
import { ApiError } from '../utils/apiResponse';
import type { ListQuery } from '../utils/pagination';
import { FollowUpStatus } from '../constants/enums.constant';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

export interface FollowUpInput {
  followUpDate: string;
  followUpTime?: string;
  notes?: string;
  status?: FollowUpStatus;
  assignedUser: string;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export const followUpService = {
  async createForEnquiry(enquiryId: string, dto: FollowUpInput, createdBy: string) {
    const followUp = await followUpRepository.create({
      ...dto,
      enquiry: new Types.ObjectId(enquiryId),
      createdBy: new Types.ObjectId(createdBy),
    } as any);
    await enquiryService.touchLastFollowUp(enquiryId, new Date(dto.followUpDate));
    return followUp;
  },

  findForEnquiry(enquiryId: string) {
    return followUpRepository.findForEnquiry(enquiryId);
  },

  async findAll(query: ListQuery & { status?: string; scope?: 'today' | 'overdue' | 'upcoming' }, user: AuthenticatedUser) {
    const visibleEnquiryIds = await enquiryService.getVisibleEnquiryIds(user);
    const filter: Record<string, unknown> = {};
    if (visibleEnquiryIds) filter.enquiry = { $in: visibleEnquiryIds };
    if (query.status) filter.status = query.status;

    const now = new Date();
    if (query.scope === 'today') {
      filter.followUpDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
      filter.status = FollowUpStatus.PENDING;
    } else if (query.scope === 'overdue') {
      filter.followUpDate = { $lt: startOfDay(now) };
      filter.status = FollowUpStatus.PENDING;
    } else if (query.scope === 'upcoming') {
      filter.followUpDate = { $gt: endOfDay(now) };
      filter.status = FollowUpStatus.PENDING;
    }

    return followUpRepository.paginate(filter, { ...query, sortBy: query.sortBy || 'followUpDate' });
  },

  async update(id: string, dto: Partial<FollowUpInput>) {
    const followUp = await followUpRepository.findById(id);
    if (!followUp) throw ApiError.notFound('Follow-up not found');
    Object.assign(followUp, dto);
    await followUp.save();
    if (dto.followUpDate) {
      await enquiryService.touchLastFollowUp(followUp.enquiry.toString(), new Date(dto.followUpDate));
    }
    return followUp;
  },

  async delete(id: string) {
    const followUp = await followUpRepository.findById(id);
    if (!followUp) throw ApiError.notFound('Follow-up not found');
    await followUpRepository.deleteById(id);
  },
};
