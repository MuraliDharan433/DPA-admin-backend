import { batchRepository } from '../repositories/batch.repository';
import { ApiError } from '../utils/apiResponse';
import type { ListQuery } from '../utils/pagination';
import { BatchStatus } from '../constants/enums.constant';

export interface BatchInput {
  name: string;
  course: string;
  trainer?: string;
  startDate: string;
  endDate: string;
  timing?: string;
  capacity: number;
  status?: BatchStatus;
}

export const batchService = {
  findAll(query: ListQuery & { status?: string; course?: string }) {
    return batchRepository.findAll(query);
  },
  findAllActive() {
    return batchRepository.findAllActive();
  },
  async findById(id: string) {
    const batch = await batchRepository.findById(id);
    if (!batch) throw ApiError.notFound('Batch not found');
    return batch;
  },
  async create(dto: BatchInput) {
    const batch = await batchRepository.create(dto as any);
    return this.findById(batch.id);
  },
  async update(id: string, dto: Partial<BatchInput>) {
    const batch = await batchRepository.findById(id);
    if (!batch) throw ApiError.notFound('Batch not found');
    Object.assign(batch, dto);
    await batch.save();
    return this.findById(batch.id);
  },
  async delete(id: string) {
    const batch = await batchRepository.findById(id);
    if (!batch) throw ApiError.notFound('Batch not found');
    await batchRepository.deleteById(id);
  },
};
