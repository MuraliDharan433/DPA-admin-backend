import { Router } from 'express';
import { jobApplicationController } from '../controllers/jobApplication.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction } from '../constants/enums.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import {
  createJobApplicationSchema,
  queryJobApplicationSchema,
  updateJobApplicationSchema,
} from '../validators/jobApplication.validator';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  validate(paginationQuerySchema.merge(queryJobApplicationSchema), 'query'),
  jobApplicationController.findAll,
);
router.get('/:id', requirePermissions(PERMISSIONS.PLACEMENTS_VIEW), jobApplicationController.findOne);
router.post(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_CREATE),
  validate(createJobApplicationSchema),
  jobApplicationController.create,
);
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_EDIT),
  validate(updateJobApplicationSchema),
  audit(AuditAction.PLACEMENT_UPDATED, 'placements'),
  jobApplicationController.update,
);
router.delete('/:id', requirePermissions(PERMISSIONS.PLACEMENTS_DELETE), jobApplicationController.remove);

export default router;
