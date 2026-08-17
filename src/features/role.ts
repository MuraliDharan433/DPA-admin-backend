import { Router } from 'express';
import { z } from 'zod';
import { RoleModel } from '../models/Role.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { PERMISSIONS, ALL_PERMISSIONS } from '../constants/permissions.constant';
import { DEFAULT_ROLE_PERMISSIONS, RoleName } from '../constants/roles.constant';

// ---------------------------------------------------------------- validation

export const createRoleSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(255).optional(),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])),
});

export const updateRoleSchema = createRoleSchema.partial();

// ------------------------------------------------------------------- helpers

export async function getRoleOrFail(id: string) {
  const role = await RoleModel.findById(id);
  if (!role) throw ApiError.notFound('Role not found');
  return role;
}

export function findRolesByNames(names: string[]) {
  return RoleModel.find({ name: { $in: names } });
}

export function findRoleByName(name: string) {
  return RoleModel.findOne({ name });
}

/** Called by the seed script. Creates missing system roles, and for existing ones unions in
 *  any new default permission keys (e.g. after a code update adds a module) without touching
 *  custom grants/revokes the Owner has already made via the permission matrix. */
export async function seedRoles() {
  for (const roleName of Object.values(RoleName)) {
    const existing = await RoleModel.findOne({ name: roleName });

    if (!existing) {
      await RoleModel.create({
        name: roleName,
        description: `Default ${roleName} role`,
        permissions: DEFAULT_ROLE_PERMISSIONS[roleName],
        isSystem: true,
      });
      continue;
    }

    if (existing.isSystem) {
      const missing = DEFAULT_ROLE_PERMISSIONS[roleName].filter((p) => !existing.permissions.includes(p));
      if (missing.length > 0) {
        existing.permissions = [...existing.permissions, ...missing];
        await existing.save();
      }
    }
  }
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (_req, res) => {
    const roles = await RoleModel.find().sort({ isSystem: -1, name: 1 });
    return ok(res, 'Roles fetched successfully', roles);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'Role fetched successfully', await getRoleOrFail(req.params.id));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.USERS_CREATE),
  validate(createRoleSchema),
  asyncHandler(async (req, res) => {
    if (await findRoleByName(req.body.name)) {
      throw ApiError.conflict('A role with this name already exists');
    }
    const role = await RoleModel.create({ ...req.body, isSystem: false });
    return created(res, 'Role created successfully', role);
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const role = await getRoleOrFail(req.params.id);

    if (role.name === RoleName.OWNER) {
      throw ApiError.badRequest('The Owner role has full access by design and cannot be modified');
    }
    if (req.body.name && req.body.name !== role.name && role.isSystem) {
      throw ApiError.badRequest('Built-in role names cannot be changed');
    }

    Object.assign(role, req.body);
    await role.save();
    return ok(res, 'Role updated successfully', role);
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_DELETE),
  asyncHandler(async (req, res) => {
    const role = await getRoleOrFail(req.params.id);
    if (role.isSystem) throw ApiError.badRequest('Built-in roles cannot be deleted');
    await RoleModel.deleteOne({ _id: req.params.id });
    return ok(res, 'Role deleted successfully', null);
  }),
);

export default router;
