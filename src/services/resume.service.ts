import { Types } from 'mongoose';
import { resumeRepository } from '../repositories/resume.repository';
import { storageService } from './storage.service';
import { ApiError } from '../utils/apiResponse';

export const resumeService = {
  async uploadForStudent(studentId: string, file: Express.Multer.File, uploadedBy: string) {
    const previousActive = await resumeRepository.findActiveForStudent(studentId);
    const latest = await resumeRepository.findLatestForStudent(studentId);
    const nextVersion = latest ? latest.version + 1 : 1;

    const uploaded = await storageService.upload(file.buffer, file.originalname, file.mimetype);

    if (previousActive) {
      previousActive.isActive = false;
      await previousActive.save();
    }

    return resumeRepository.create({
      student: new Types.ObjectId(studentId),
      fileName: file.originalname,
      fileKey: uploaded.key,
      fileUrl: uploaded.url || undefined,
      fileType: file.mimetype,
      fileSize: file.size,
      version: nextVersion,
      isActive: true,
      uploadedBy: new Types.ObjectId(uploadedBy),
    });
  },

  findVersionsForStudent(studentId: string) {
    return resumeRepository.findVersionsForStudent(studentId);
  },

  async findById(id: string) {
    const resume = await resumeRepository.findById(id);
    if (!resume) throw ApiError.notFound('Resume not found');
    return resume;
  },

  async getFileBuffer(id: string) {
    const resume = await this.findById(id);
    const buffer = await storageService.readBuffer(resume.fileKey);
    return { buffer, resume };
  },

  async delete(id: string) {
    const resume = await this.findById(id);
    await storageService.delete(resume.fileKey);
    await resumeRepository.deleteById(id);

    if (resume.isActive) {
      const latestRemaining = await resumeRepository.findLatestForStudent(String(resume.student));
      if (latestRemaining) {
        latestRemaining.isActive = true;
        await latestRemaining.save();
      }
    }
  },
};
