import { Router } from 'express';
import { z } from 'zod';
import { SettingModel } from '../models/Setting.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { PERMISSIONS } from '../constants/permissions.constant';

const GLOBAL_KEY = 'global';

// ---------------------------------------------------------------- validation

export const updateSettingSchema = z.object({
  instituteName: z.string().max(150).optional(),
  instituteEmail: z.string().email().optional().or(z.literal('')),
  institutePhone: z.string().max(30).optional(),
  instituteAddress: z.string().max(300).optional(),
});

// ------------------------------------------------------------------- helpers

/** There is exactly one settings document; create it lazily on first read. */
async function getGlobalSettings() {
  const existing = await SettingModel.findOne({ key: GLOBAL_KEY });
  return existing || SettingModel.create({ key: GLOBAL_KEY });
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.SETTINGS_VIEW),
  asyncHandler(async (_req, res) => {
    return ok(res, 'Settings fetched successfully', await getGlobalSettings());
  }),
);

router.patch(
  '/',
  requirePermissions(PERMISSIONS.SETTINGS_EDIT),
  validate(updateSettingSchema),
  asyncHandler(async (req, res) => {
    const setting = await getGlobalSettings();
    Object.assign(setting, req.body, { updatedBy: req.user!.userId });
    await setting.save();
    return ok(res, 'Settings updated successfully', setting);
  }),
);

export default router;
