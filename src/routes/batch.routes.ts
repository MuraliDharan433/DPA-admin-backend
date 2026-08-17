import { Router } from 'express';
import { batchController } from '../controllers/batch.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { AuditAction } from '../constants/enums.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import { createBatchSchema, queryBatchSchema, updateBatchSchema } from '../validators/batch.validator';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.BATCHES_VIEW),
  validate(paginationQuerySchema.merge(queryBatchSchema), 'query'),
  batchController.findAll,
);
router.get('/active', requirePermissions(PERMISSIONS.BATCHES_VIEW), batchController.findAllActive);
router.get('/:id', requirePermissions(PERMISSIONS.BATCHES_VIEW), batchController.findOne);
router.post(
  '/',
  requirePermissions(PERMISSIONS.BATCHES_CREATE),
  validate(createBatchSchema),
  audit(AuditAction.BATCH_CREATED, 'batches'),
  batchController.create,
);
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.BATCHES_EDIT),
  validate(updateBatchSchema),
  audit(AuditAction.BATCH_UPDATED, 'batches'),
  batchController.update,
);
router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.BATCHES_DELETE),
  audit(AuditAction.BATCH_DELETED, 'batches'),
  batchController.remove,
);

export default router;
