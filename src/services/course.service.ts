import { courseRepository } from '../repositories/course.repository';
import { ApiError } from '../utils/apiResponse';
import type { ListQuery } from '../utils/pagination';
import { CourseMode, CourseStatus } from '../constants/enums.constant';

export interface CourseInput {
  name: string;
  code: string;
  description?: string;
  duration: string;
  fee: number;
  mode: CourseMode;
  status?: CourseStatus;
  modules?: string[];
}

export const courseService = {
  findAll(query: ListQuery & { status?: string; mode?: string }) {
    return courseRepository.findAll(query);
  },
  findAllActive() {
    return courseRepository.findAllActive();
  },
  async findById(id: string) {
    const course = await courseRepository.findById(id);
    if (!course) throw ApiError.notFound('Course not found');
    return course;
  },
  async create(dto: CourseInput) {
    const existing = await courseRepository.findByCode(dto.code);
    if (existing) throw ApiError.conflict('A course with this code already exists');
    return courseRepository.create({ ...dto, code: dto.code.toUpperCase() });
  },
  async update(id: string, dto: Partial<CourseInput>) {
    const course = await this.findById(id);
    if (dto.code && dto.code.toUpperCase() !== course.code) {
      const existing = await courseRepository.findByCode(dto.code);
      if (existing) throw ApiError.conflict('A course with this code already exists');
    }
    Object.assign(course, { ...dto, ...(dto.code ? { code: dto.code.toUpperCase() } : {}) });
    await course.save();
    return course;
  },
  async delete(id: string) {
    await this.findById(id);
    await courseRepository.deleteById(id);
  },
};
