import { Types } from 'mongoose';
import { mockSessionRepository } from '../repositories/mockSession.repository';
import { ApiError } from '../utils/apiResponse';
import type { MockSessionType } from '../models/MockSession.model';
import type { ListQuery } from '../utils/pagination';

export interface MockSessionInput {
  type: MockSessionType;
  date: string;
  trainer: string;
  feedback?: string;
  rating: number;
}

export const mockSessionService = {
  findForStudent(studentId: string) {
    return mockSessionRepository.findForStudent(studentId);
  },

  findAll(query: ListQuery & { student?: string; trainer?: string; type?: string }) {
    return mockSessionRepository.findAll(query);
  },

  async createForStudent(studentId: string, dto: MockSessionInput, createdBy: string) {
    return mockSessionRepository.create({
      ...dto,
      date: new Date(dto.date),
      student: new Types.ObjectId(studentId),
      trainer: new Types.ObjectId(dto.trainer),
      createdBy: new Types.ObjectId(createdBy),
    });
  },

  async create(dto: MockSessionInput & { student: string }, createdBy: string) {
    return mockSessionRepository.create({
      ...dto,
      date: new Date(dto.date),
      student: new Types.ObjectId(dto.student),
      trainer: new Types.ObjectId(dto.trainer),
      createdBy: new Types.ObjectId(createdBy),
    });
  },

  async update(id: string, dto: Partial<MockSessionInput>) {
    const session = await mockSessionRepository.findById(id);
    if (!session) throw ApiError.notFound('Mock session not found');
    Object.assign(session, dto);
    await session.save();
    return session;
  },

  async delete(id: string) {
    const session = await mockSessionRepository.findById(id);
    if (!session) throw ApiError.notFound('Mock session not found');
    await mockSessionRepository.deleteById(id);
  },
};
