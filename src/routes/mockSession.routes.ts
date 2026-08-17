import { Router } from 'express';
import { mockSessionController } from '../controllers/mockSession.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import {
  createGeneralMockSessionSchema,
  createMockSessionSchema,
  queryMockSessionSchema,
  updateMockSessionSchema,
} from '../validators/mockSession.validator';

const router = Router();
router.use(requireAuth);

router.get(
  '/mock-sessions',
  requirePermissions(PERMISSIONS.MOCK_VIEW),
  validate(paginationQuerySchema.merge(queryMockSessionSchema), 'query'),
  mockSessionController.findAll,
);
router.post(
  '/mock-sessions',
  requirePermissions(PERMISSIONS.MOCK_CREATE),
  validate(createGeneralMockSessionSchema),
  mockSessionController.create,
);
router.patch(
  '/mock-sessions/:id',
  requirePermissions(PERMISSIONS.MOCK_EDIT),
  validate(updateMockSessionSchema),
  mockSessionController.update,
);
router.delete(
  '/mock-sessions/:id',
  requirePermissions(PERMISSIONS.MOCK_DELETE),
  mockSessionController.remove,
);

router.get(
  '/students/:studentId/mock-sessions',
  requirePermissions(PERMISSIONS.MOCK_VIEW),
  mockSessionController.findForStudent,
);
router.post(
  '/students/:studentId/mock-sessions',
  requirePermissions(PERMISSIONS.MOCK_CREATE),
  validate(createMockSessionSchema),
  mockSessionController.createForStudent,
);

export default router;
