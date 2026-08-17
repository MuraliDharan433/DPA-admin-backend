import { Router } from 'express';
import { interviewController } from '../controllers/interview.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { paginationQuerySchema } from '../validators/common.validator';
import {
  createInterviewSchema,
  queryInterviewSchema,
  updateInterviewSchema,
} from '../validators/interview.validator';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_VIEW),
  validate(paginationQuerySchema.merge(queryInterviewSchema), 'query'),
  interviewController.findAll,
);
router.get('/:id', requirePermissions(PERMISSIONS.PLACEMENTS_VIEW), interviewController.findOne);
router.post(
  '/',
  requirePermissions(PERMISSIONS.PLACEMENTS_CREATE),
  validate(createInterviewSchema),
  interviewController.create,
);
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.PLACEMENTS_EDIT),
  validate(updateInterviewSchema),
  interviewController.update,
);
router.delete('/:id', requirePermissions(PERMISSIONS.PLACEMENTS_DELETE), interviewController.remove);

export default router;
