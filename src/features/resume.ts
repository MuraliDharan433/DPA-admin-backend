import { Router } from 'express';
import { Types } from 'mongoose';
import { ResumeModel } from '../models/Resume.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { audit } from '../middleware/audit.middleware';
import { resumeUpload } from '../middleware/upload.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { storageService } from '../utils/storage';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction } from '../constants/enums.constant';

// ------------------------------------------------------------------- helpers

async function getResumeOrFail(id: string) {
  const resume = await ResumeModel.findById(id);
  if (!resume) throw ApiError.notFound('Resume not found');
  return resume;
}

// -------------------------------------------------------------------- routes
// Mounted at '/' because it owns both /students/:studentId/resumes and /resumes/:id.

const router = Router();
router.use(requireAuth);

router.post(
  '/students/:studentId/resumes',
  requirePermissions(PERMISSIONS.RESUMES_UPLOAD),
  resumeUpload.single('file'),
  audit(AuditAction.RESUME_UPLOADED, 'resumes'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file uploaded');
    const { studentId } = req.params;

    const previousActive = await ResumeModel.findOne({ student: studentId, isActive: true });
    const latest = await ResumeModel.findOne({ student: studentId }).sort({ version: -1 });

    const uploaded = await storageService.upload(req.file.buffer, req.file.originalname, req.file.mimetype);

    if (previousActive) {
      previousActive.isActive = false;
      await previousActive.save();
    }

    const resume = await ResumeModel.create({
      student: new Types.ObjectId(studentId),
      fileName: req.file.originalname,
      fileKey: uploaded.key,
      fileUrl: uploaded.url || undefined,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      version: latest ? latest.version + 1 : 1,
      isActive: true,
      uploadedBy: new Types.ObjectId(req.user!.userId),
    });

    return created(res, 'Resume uploaded successfully', resume);
  }),
);

router.get(
  '/students/:studentId/resumes',
  requirePermissions(PERMISSIONS.RESUMES_VIEW),
  asyncHandler(async (req, res) => {
    const versions = await ResumeModel.find({ student: req.params.studentId })
      .populate('uploadedBy')
      .sort({ version: -1 });
    return ok(res, 'Resume versions fetched successfully', versions);
  }),
);

router.get(
  '/resumes/:id/file',
  requirePermissions(PERMISSIONS.RESUMES_VIEW),
  asyncHandler(async (req, res) => {
    const resume = await getResumeOrFail(req.params.id);
    const buffer = await storageService.readBuffer(resume.fileKey);
    const download = req.query.download === 'true';

    res.set({
      'Content-Type': resume.fileType,
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(resume.fileName)}"`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }),
);

router.delete(
  '/resumes/:id',
  requirePermissions(PERMISSIONS.RESUMES_DELETE),
  audit(AuditAction.RESUME_DELETED, 'resumes'),
  asyncHandler(async (req, res) => {
    const resume = await getResumeOrFail(req.params.id);

    await storageService.delete(resume.fileKey);
    await ResumeModel.deleteOne({ _id: req.params.id });

    // Promote the next most recent version so a student always has an active resume.
    if (resume.isActive) {
      const latestRemaining = await ResumeModel.findOne({ student: resume.student }).sort({ version: -1 });
      if (latestRemaining) {
        latestRemaining.isActive = true;
        await latestRemaining.save();
      }
    }

    return ok(res, 'Resume deleted successfully', null);
  }),
);

export default router;
