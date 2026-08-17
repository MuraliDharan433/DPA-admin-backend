import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { createRoleSchema, updateRoleSchema } from '../validators/role.validator';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermissions(PERMISSIONS.USERS_VIEW), roleController.findAll);
router.get('/:id', requirePermissions(PERMISSIONS.USERS_VIEW), roleController.findOne);
router.post('/', requirePermissions(PERMISSIONS.USERS_CREATE), validate(createRoleSchema), roleController.create);
router.patch('/:id', requirePermissions(PERMISSIONS.USERS_EDIT), validate(updateRoleSchema), roleController.update);
router.delete('/:id', requirePermissions(PERMISSIONS.USERS_DELETE), roleController.remove);

export default router;
