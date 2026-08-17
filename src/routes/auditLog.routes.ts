import { Router } from 'express';
import { auditLogController } from '../controllers/auditLog.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermissions(PERMISSIONS.AUDIT_LOGS_VIEW), auditLogController.findAll);

export default router;
