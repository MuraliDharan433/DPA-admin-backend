import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction } from '../constants/enums.constant';
import {
  adminResetPasswordSchema,
  createUserSchema,
  updatePermissionsSchema,
  updateStatusSchema,
  updateUserSchema,
} from '../validators/user.validator';

const router = Router();
router.use(requireAuth);

router.get('/lookup', userController.lookup);
router.get('/', requirePermissions(PERMISSIONS.USERS_VIEW), userController.findAll);
router.get('/:id', requirePermissions(PERMISSIONS.USERS_VIEW), userController.findOne);

router.post(
  '/',
  requirePermissions(PERMISSIONS.USERS_CREATE),
  validate(createUserSchema),
  audit(AuditAction.USER_CREATED, 'users'),
  userController.create,
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(updateUserSchema),
  audit(AuditAction.USER_UPDATED, 'users'),
  userController.update,
);

router.patch(
  '/:id/permissions',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(updatePermissionsSchema),
  audit(AuditAction.PERMISSION_CHANGED, 'users'),
  userController.updatePermissions,
);

router.patch(
  '/:id/status',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(updateStatusSchema),
  userController.updateStatus,
);

router.post(
  '/:id/activate',
  requirePermissions(PERMISSIONS.USERS_ACTIVATE),
  audit(AuditAction.USER_ACTIVATED, 'users'),
  userController.activate,
);

router.post(
  '/:id/deactivate',
  requirePermissions(PERMISSIONS.USERS_DEACTIVATE),
  audit(AuditAction.USER_DEACTIVATED, 'users'),
  userController.deactivate,
);

router.post(
  '/:id/reset-password',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(adminResetPasswordSchema),
  audit(AuditAction.PASSWORD_RESET, 'users'),
  userController.resetPassword,
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_DELETE),
  audit(AuditAction.USER_DELETED, 'users'),
  userController.remove,
);

export default router;
