import { Router } from 'express';
import { resumeController } from '../controllers/resume.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { audit } from '../middleware/audit.middleware';
import { resumeUpload } from '../middleware/upload.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction } from '../constants/enums.constant';

const router = Router();
router.use(requireAuth);

router.post(
  '/students/:studentId/resumes',
  requirePermissions(PERMISSIONS.RESUMES_UPLOAD),
  resumeUpload.single('file'),
  audit(AuditAction.RESUME_UPLOADED, 'resumes'),
  resumeController.upload,
);
router.get(
  '/students/:studentId/resumes',
  requirePermissions(PERMISSIONS.RESUMES_VIEW),
  resumeController.listVersions,
);
router.get('/resumes/:id/file', requirePermissions(PERMISSIONS.RESUMES_VIEW), resumeController.getFile);
router.delete(
  '/resumes/:id',
  requirePermissions(PERMISSIONS.RESUMES_DELETE),
  audit(AuditAction.RESUME_DELETED, 'resumes'),
  resumeController.remove,
);

export default router;
