import { Router } from 'express';
import { PermissionModel } from '../models/Permission.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { PERMISSIONS, PERMISSION_GROUPS } from '../constants/permissions.constant';

// ------------------------------------------------------------------- helpers

/** Called by the seed script - upserts the permission catalogue from the constants file. */
export async function seedPermissions() {
  const ops = Object.entries(PERMISSION_GROUPS).flatMap(([group, def]) =>
    def.actions.map((action) => ({
      updateOne: {
        filter: { key: action.key },
        update: { $set: { key: action.key, label: action.label, group } },
        upsert: true,
      },
    })),
  );
  if (ops.length) await PermissionModel.bulkWrite(ops);
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (_req, res) => {
    const permissions = await PermissionModel.find().sort({ group: 1, key: 1 });
    return ok(res, 'Permissions fetched successfully', permissions);
  }),
);

export default router;
