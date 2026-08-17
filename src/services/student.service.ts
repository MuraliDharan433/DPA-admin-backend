import { Types } from 'mongoose';
import { studentRepository } from '../repositories/student.repository';
import { ApiError } from '../utils/apiResponse';
import type { ListQuery } from '../utils/pagination';
import { TrainingStatus, PlacementStatus, Gender, StudentType } from '../constants/enums.constant';

export interface WorkHistoryEntryInput {
  company: string;
  role?: string;
  years?: number;
}

export interface StudentInput {
  firstName: string;
  lastName: string;
  dob?: string;
  gender?: Gender;
  email: string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  highestQualification?: string;
  college?: string;
  university?: string;
  graduationYear?: number;
  percentage?: number;
  skills?: string[];
  course: string;
  batch?: string;
  joiningDate?: string;
  courseStartDate?: string;
  courseEndDate?: string;
  trainingStatus?: TrainingStatus;
  completedModules?: string[];
  studentType?: StudentType;
  lastCompany?: string;
  totalYearsExperience?: number;
  pfStatus?: boolean;
  workHistory?: WorkHistoryEntryInput[];
  placementStatus?: PlacementStatus;
  currentCompany?: string;
  jobTitle?: string;
  package?: number;
  placementDate?: string;
  sourceEnquiry?: string;
}

export const studentService = {
  findAll(query: ListQuery & { trainingStatus?: string; placementStatus?: string; course?: string; batch?: string }) {
    return studentRepository.findAll(query);
  },

  async findById(id: string) {
    const student = await studentRepository.findById(id);
    if (!student) throw ApiError.notFound('Student not found');
    return student;
  },

  async create(dto: StudentInput, createdBy: string) {
    const existing = await studentRepository.findByEmail(dto.email);
    if (existing) throw ApiError.conflict('A student with this email already exists');

    const studentId = await studentRepository.nextStudentId();
    const student = await studentRepository.create({
      ...dto,
      studentId,
      email: dto.email.toLowerCase(),
      createdBy: new Types.ObjectId(createdBy),
    } as any);
    return this.findById(student.id);
  },

  async update(id: string, dto: Partial<StudentInput>) {
    const student = await studentRepository.findById(id);
    if (!student) throw ApiError.notFound('Student not found');

    if (dto.email && dto.email.toLowerCase() !== student.email) {
      const existing = await studentRepository.findByEmail(dto.email);
      if (existing) throw ApiError.conflict('A student with this email already exists');
    }

    const { completedModules, ...rest } = dto;
    Object.assign(student, { ...rest, ...(dto.email ? { email: dto.email.toLowerCase() } : {}) });

    if (completedModules) {
      // The client sends the desired set of completed class names; preserve the original
      // completion date for classes that were already marked done, and stamp "now" for
      // newly-completed ones, so re-saving the same list never resets its dates.
      const existingByName = new Map(student.completedModules.map((m) => [m.module, m.completedAt]));
      student.completedModules = completedModules.map((moduleName) => ({
        module: moduleName,
        completedAt: existingByName.get(moduleName) || new Date(),
      }));
    }

    await student.save();
    return this.findById(student.id);
  },

  async delete(id: string) {
    const student = await studentRepository.findById(id);
    if (!student) throw ApiError.notFound('Student not found');
    await studentRepository.deleteById(id);
  },

  async addNote(id: string, text: string, userId: string) {
    const student = await studentRepository.findById(id);
    if (!student) throw ApiError.notFound('Student not found');
    student.notes.push({ text, createdBy: new Types.ObjectId(userId), createdAt: new Date() });
    await student.save();
    return this.findById(student.id);
  },

  async createFromEnquiry(
    data: Partial<StudentInput> & { email: string; firstName: string; lastName: string; mobile: string; course: string },
    createdBy: string,
    sourceEnquiry: string,
  ) {
    const studentId = await studentRepository.nextStudentId();
    const student = await studentRepository.create({
      ...data,
      studentId,
      email: data.email.toLowerCase(),
      createdBy: new Types.ObjectId(createdBy),
      sourceEnquiry: new Types.ObjectId(sourceEnquiry),
    } as any);
    return this.findById(student.id);
  },

  countByFilter(filter: Record<string, unknown>) {
    return studentRepository.countByFilter(filter);
  },
};
