import { ResumeModel, IResume } from '../models/Resume.model';

export const resumeRepository = {
  findActiveForStudent(studentId: string) {
    return ResumeModel.findOne({ student: studentId, isActive: true });
  },
  findVersionsForStudent(studentId: string) {
    return ResumeModel.find({ student: studentId }).populate('uploadedBy').sort({ version: -1 });
  },
  findById(id: string) {
    return ResumeModel.findById(id);
  },
  findLatestForStudent(studentId: string) {
    return ResumeModel.findOne({ student: studentId }).sort({ version: -1 });
  },
  create(data: Partial<IResume>) {
    return ResumeModel.create(data);
  },
  deleteById(id: string) {
    return ResumeModel.deleteOne({ _id: id });
  },
};
