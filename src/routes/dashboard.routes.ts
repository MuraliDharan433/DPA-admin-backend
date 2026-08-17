import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/stats', dashboardController.getStats);
router.get('/charts', dashboardController.getCharts);
router.get('/recent-activity', dashboardController.getRecentActivity);

export default router;
