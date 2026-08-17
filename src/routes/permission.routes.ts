import { Router } from 'express';
import { permissionController } from '../controllers/permission.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermissions(PERMISSIONS.USERS_VIEW), permissionController.findAll);

export default router;
