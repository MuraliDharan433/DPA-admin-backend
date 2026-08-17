import { Router } from 'express';
import { studentController } from '../controllers/student.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction } from '../constants/enums.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import {
  addNoteSchema,
  createStudentSchema,
  queryStudentSchema,
  updateStudentSchema,
} from '../validators/student.validator';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.STUDENTS_VIEW),
  validate(paginationQuerySchema.merge(queryStudentSchema), 'query'),
  studentController.findAll,
);
router.get('/:id', requirePermissions(PERMISSIONS.STUDENTS_VIEW), studentController.findOne);
router.post(
  '/',
  requirePermissions(PERMISSIONS.STUDENTS_CREATE),
  validate(createStudentSchema),
  audit(AuditAction.STUDENT_CREATED, 'students'),
  studentController.create,
);
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.STUDENTS_EDIT),
  validate(updateStudentSchema),
  audit(AuditAction.STUDENT_UPDATED, 'students'),
  studentController.update,
);
router.post(
  '/:id/notes',
  requirePermissions(PERMISSIONS.STUDENTS_EDIT),
  validate(addNoteSchema),
  studentController.addNote,
);
router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.STUDENTS_DELETE),
  audit(AuditAction.STUDENT_DELETED, 'students'),
  studentController.remove,
);

export default router;
