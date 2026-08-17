import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';

const router = Router();
router.use(requireAuth);
router.use(requirePermissions(PERMISSIONS.REPORTS_VIEW));

router.get('/students/export', reportController.exportStudents);
router.get('/enquiries/export', reportController.exportEnquiries);
router.get('/placements/export', reportController.exportPlacements);

export default router;
