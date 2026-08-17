import { Types } from 'mongoose';
import { enquiryRepository } from '../repositories/enquiry.repository';
import { studentService } from './student.service';
import { userService } from './user.service';
import { notificationService } from './notification.service';
import { ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import type { ListQuery } from '../utils/pagination';
import { EnquirySource, EnquiryStatus, NotificationType } from '../constants/enums.constant';
import { RoleName } from '../constants/roles.constant';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface EnquiryInput {
  name: string;
  email: string;
  mobile: string;
  course?: string;
  message?: string;
  source?: EnquirySource;
  status?: EnquiryStatus;
  assignedTo?: string;
}

export interface PublicEnquiryInput {
  name: string;
  email: string;
  mobile: string;
  course?: string;
  message?: string;
  website?: string; // honeypot
}

/**
 * Enquiries are sensitive - Owner sees everything by default. The built-in COUNSELOR
 * role is always scoped to "assigned to me" regardless of holding enquiries.view (that
 * permission just lets them use the module at all). Anyone else Owner grants
 * enquiries.view to (custom roles, Admin, Staff) gets full visibility - that's the
 * "broader access" the spec calls out.
 */
function buildScopeFilter(user: AuthenticatedUser): Record<string, unknown> {
  if (user.roleName === RoleName.OWNER) return {};
  if (user.roleName === RoleName.COUNSELOR) return { assignedTo: new Types.ObjectId(user.userId) };
  return {};
}

export const enquiryService = {
  findAll(
    query: ListQuery & {
      status?: string;
      course?: string;
      assignedTo?: string;
      source?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    user: AuthenticatedUser,
  ) {
    return enquiryRepository.findAll(buildScopeFilter(user), query);
  },

  async findById(id: string, user: AuthenticatedUser) {
    const enquiry = await enquiryRepository.findOneScoped(id, buildScopeFilter(user));
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    return enquiry;
  },

  create(dto: EnquiryInput, createdBy: string) {
    return enquiryRepository.create({
      ...dto,
      email: dto.email.toLowerCase(),
      source: dto.source || EnquirySource.WALK_IN,
      createdBy: new Types.ObjectId(createdBy),
    } as any);
  },

  /**
   * Public, unauthenticated entry point for the static website's enquiry form. Silently
   * no-ops on honeypot fill (bot) or a duplicate submitted within 24h, without revealing
   * that distinction back to the caller.
   */
  async createFromPublicSite(dto: PublicEnquiryInput, ipAddress: string) {
    if (dto.website && dto.website.trim().length > 0) {
      logger.warn(`Honeypot triggered from IP ${ipAddress} - likely bot, dropped silently`);
      return { accepted: true };
    }

    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const duplicate = await enquiryRepository.findDuplicate(dto.email.toLowerCase(), dto.mobile, since);
    if (duplicate) {
      logger.log(`Duplicate enquiry suppressed for ${dto.email} within 24h window`);
      return { accepted: true };
    }

    const enquiry = await enquiryRepository.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      mobile: dto.mobile,
      course: dto.course,
      message: dto.message,
      source: EnquirySource.WEBSITE,
      status: EnquiryStatus.NEW,
      ipAddress,
    } as any);

    const owners = await userService.lookupByRoleName(RoleName.OWNER);
    await notificationService.createForUsers(
      owners.map((o: any) => String(o._id)),
      NotificationType.NEW_ENQUIRY,
      'New enquiry received',
      `${enquiry.name} enquired about ${enquiry.course || 'a course'}`,
      `/enquiries/${enquiry.id}`,
    );

    return { accepted: true };
  },

  async update(id: string, dto: Partial<EnquiryInput>, user: AuthenticatedUser) {
    const enquiry = await enquiryRepository.findOneScoped(id, buildScopeFilter(user));
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    Object.assign(enquiry, { ...dto, ...(dto.email ? { email: dto.email.toLowerCase() } : {}) });
    await enquiry.save();
    return enquiry;
  },

  async updateStatus(id: string, status: EnquiryStatus, user: AuthenticatedUser) {
    const enquiry = await enquiryRepository.findOneScoped(id, buildScopeFilter(user));
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    enquiry.status = status;
    await enquiry.save();
    return enquiry;
  },

  async assign(id: string, assignedTo: string) {
    const enquiry = await enquiryRepository.findByIdRaw(id);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    enquiry.assignedTo = new Types.ObjectId(assignedTo);
    if (enquiry.status === EnquiryStatus.NEW) enquiry.status = EnquiryStatus.CONTACTED;
    await enquiry.save();

    await notificationService.createForUsers(
      [assignedTo],
      NotificationType.ENQUIRY_ASSIGNED,
      'Enquiry assigned to you',
      `${enquiry.name} - ${enquiry.course || 'General enquiry'}`,
      `/enquiries/${enquiry.id}`,
    );

    return enquiry;
  },

  async delete(id: string) {
    const enquiry = await enquiryRepository.findByIdRaw(id);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    await enquiryRepository.deleteById(id);
  },

  async convertToStudent(id: string, dto: { course: string; batch?: string }, user: AuthenticatedUser) {
    const enquiry = await enquiryRepository.findOneScoped(id, buildScopeFilter(user));
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    if (enquiry.convertedToStudent) {
      throw ApiError.badRequest('This enquiry has already been converted to a student');
    }

    const [firstName, ...rest] = enquiry.name.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName;

    const student = await studentService.createFromEnquiry(
      {
        firstName,
        lastName,
        email: enquiry.email,
        mobile: enquiry.mobile,
        course: dto.course,
        batch: dto.batch,
      },
      user.userId,
      enquiry.id,
    );

    enquiry.convertedToStudent = student._id as Types.ObjectId;
    enquiry.status = EnquiryStatus.CONVERTED;
    await enquiry.save();

    return { enquiry, studentId: student.id };
  },

  touchLastFollowUp(enquiryId: string, date: Date) {
    return enquiryRepository.touchLastFollowUp(enquiryId, date);
  },

  async getVisibleEnquiryIds(user: AuthenticatedUser): Promise<Types.ObjectId[] | null> {
    const filter = buildScopeFilter(user);
    if (Object.keys(filter).length === 0) return null; // null = no restriction
    const enquiries = await enquiryRepository.findVisibleIds(filter);
    return enquiries.map((e) => e._id as Types.ObjectId);
  },

  buildScopeFilter,
};
