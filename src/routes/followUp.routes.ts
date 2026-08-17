import { Router } from 'express';
import { followUpController } from '../controllers/enquiry.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import { queryFollowUpSchema, updateFollowUpSchema } from '../validators/enquiry.validator';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.ENQUIRIES_VIEW),
  validate(paginationQuerySchema.merge(queryFollowUpSchema), 'query'),
  followUpController.findAll,
);
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.ENQUIRIES_EDIT),
  validate(updateFollowUpSchema),
  followUpController.update,
);
router.delete('/:id', requirePermissions(PERMISSIONS.ENQUIRIES_EDIT), followUpController.remove);

export default router;
