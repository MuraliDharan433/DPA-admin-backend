import { Router } from 'express';
import { settingController } from '../controllers/setting.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../constants/permissions.constant';
import { updateSettingSchema } from '../validators/setting.validator';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermissions(PERMISSIONS.SETTINGS_VIEW), settingController.get);
router.patch(
  '/',
  requirePermissions(PERMISSIONS.SETTINGS_EDIT),
  validate(updateSettingSchema),
  settingController.update,
);

export default router;
