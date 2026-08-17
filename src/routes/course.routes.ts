import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction } from '../constants/enums.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import { createCourseSchema, queryCourseSchema, updateCourseSchema } from '../validators/course.validator';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.COURSES_VIEW),
  validate(paginationQuerySchema.merge(queryCourseSchema), 'query'),
  courseController.findAll,
);
router.get('/active', requirePermissions(PERMISSIONS.COURSES_VIEW), courseController.findAllActive);
router.get('/:id', requirePermissions(PERMISSIONS.COURSES_VIEW), courseController.findOne);
router.post(
  '/',
  requirePermissions(PERMISSIONS.COURSES_CREATE),
  validate(createCourseSchema),
  audit(AuditAction.COURSE_CREATED, 'courses'),
  courseController.create,
);
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.COURSES_EDIT),
  validate(updateCourseSchema),
  audit(AuditAction.COURSE_UPDATED, 'courses'),
  courseController.update,
);
router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.COURSES_DELETE),
  audit(AuditAction.COURSE_DELETED, 'courses'),
  courseController.remove,
);

export default router;
