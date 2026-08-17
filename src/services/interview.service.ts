import { interviewRepository } from '../repositories/interview.repository';
import { ApiError } from '../utils/apiResponse';
import type { ListQuery } from '../utils/pagination';
import { InterviewStatus, InterviewResult } from '../constants/enums.constant';

export interface InterviewInput {
  application: string;
  student: string;
  interviewDate: string;
  round?: string;
  status?: InterviewStatus;
  result?: InterviewResult;
  interviewer?: string;
  feedback?: string;
}

export const interviewService = {
  findAll(query: ListQuery & { status?: string; result?: string; student?: string; application?: string }) {
    return interviewRepository.findAll(query);
  },
  async findById(id: string) {
    const interview = await interviewRepository.findById(id);
    if (!interview) throw ApiError.notFound('Interview not found');
    return interview;
  },
  create(dto: InterviewInput, createdBy: string) {
    return interviewRepository.create({ ...dto, createdBy } as any);
  },
  async update(id: string, dto: Partial<InterviewInput>) {
    const interview = await interviewRepository.findById(id);
    if (!interview) throw ApiError.notFound('Interview not found');
    Object.assign(interview, dto);
    await interview.save();
    return interview;
  },
  async delete(id: string) {
    const interview = await interviewRepository.findById(id);
    if (!interview) throw ApiError.notFound('Interview not found');
    await interviewRepository.deleteById(id);
  },
};
