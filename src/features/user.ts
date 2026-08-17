import { Router } from 'express';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { UserModel, type IUser } from '../models/User.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { validate } from '../middleware/validate.middleware';
import { audit } from '../middleware/audit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created, ApiError } from '../utils/apiResponse';
import { paginate, buildSearchFilter, parseListQuery, type ListQuery } from '../utils/pagination';
import { mongoIdSchema, strongPassword } from '../utils/validation';
import { hashPassword } from '../utils/password';
import { computeEffectivePermissions } from '../utils/effectivePermissions';
import { PERMISSIONS, ALL_PERMISSIONS, type PermissionKey } from '../constants/permissions.constant';
import { AuditAction, UserStatus } from '../constants/enums.constant';
import { RoleName } from '../constants/roles.constant';
import { getRoleOrFail, findRolesByNames } from './role';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------- validation

const permissionArray = z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).optional();

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  mobile: z.string().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid mobile number'),
  role: mongoIdSchema,
  password: strongPassword,
  status: z.nativeEnum(UserStatus).optional(),
  permissionGrants: permissionArray,
  permissionRevokes: permissionArray,
});

export const updateUserSchema = createUserSchema.omit({ password: true }).partial();

export const updatePermissionsSchema = z.object({
  grant: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])),
  revoke: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])),
});

export const updateStatusSchema = z.object({ status: z.nativeEnum(UserStatus) });

export const adminResetPasswordSchema = z.object({ newPassword: strongPassword.optional() });

// ------------------------------------------------------------------- helpers
// Exported for auth (login/refresh/password flows) and other features.

export async function getUserOrFail(id: string) {
  const user = await UserModel.findById(id).populate('role');
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export function findUserByEmailWithSecrets(email: string) {
  return UserModel.findOne({ email: email.toLowerCase() })
    .select('+passwordHash +refreshTokenHash')
    .populate('role');
}

export function findUserByPasswordResetTokenHash(tokenHash: string) {
  return UserModel.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  })
    .select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash')
    .populate('role');
}

export function getEffectivePermissions(user: IUser): PermissionKey[] {
  const role = user.role as unknown as { name: string; permissions: PermissionKey[] };
  return computeEffectivePermissions({ name: role.name, permissions: role.permissions }, user);
}

/** Accepts a single role name or a comma-separated list (e.g. "COUNSELOR,ADMIN"). */
export async function lookupUsersByRoleNames(roleName: string) {
  const names = roleName.split(',').map((n) => n.trim()).filter(Boolean);
  if (!names.length) return [];

  const roles = await findRolesByNames(names);
  if (!roles.length) return [];

  return UserModel.find({ role: { $in: roles.map((r) => r._id) }, status: UserStatus.ACTIVE })
    .select('firstName lastName email')
    .sort({ firstName: 1 });
}

export async function recordSuccessfulLogin(userId: string) {
  await UserModel.updateOne(
    { _id: userId },
    { $set: { lastLoginAt: new Date(), failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } },
  );
}

export async function recordFailedLogin(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) return;
  user.failedLoginAttempts += 1;
  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
  }
  await user.save();
}

export async function setRefreshTokenHash(userId: string, hash: string | null) {
  if (hash === null) await UserModel.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } });
  else await UserModel.updateOne({ _id: userId }, { $set: { refreshTokenHash: hash } });
}

export async function setUserPassword(userId: string, passwordHash: string) {
  await UserModel.updateOne(
    { _id: userId },
    { $set: { passwordHash }, $unset: { refreshTokenHash: 1 } },
  );
}

export async function setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
  await UserModel.updateOne(
    { _id: userId },
    { $set: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt } },
  );
}

export async function clearPasswordResetToken(userId: string) {
  await UserModel.updateOne(
    { _id: userId },
    { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
  );
}

/** Only used by the seed script - the regular POST /users path deliberately refuses OWNER. */
export async function createOwnerIfNotExists(params: {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  roleId: Types.ObjectId;
}) {
  const existing = await UserModel.findOne({ email: params.email.toLowerCase() });
  if (existing) return existing;

  return UserModel.create({
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email.toLowerCase(),
    mobile: params.mobile,
    passwordHash: await hashPassword(params.password),
    role: params.roleId,
    status: UserStatus.ACTIVE,
  });
}

async function setStatus(id: string, status: UserStatus) {
  const user = await getUserOrFail(id);
  const role = user.role as unknown as { name: string };
  if (role.name === RoleName.OWNER) throw ApiError.badRequest('The Owner account status cannot be changed');

  user.status = status;
  if (status !== UserStatus.SUSPENDED) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
  }
  await user.save();
  return getUserOrFail(id);
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

// Deliberately before '/:id' so "lookup" isn't captured as an id.
router.get(
  '/lookup',
  asyncHandler(async (req, res) => {
    const users = await lookupUsersByRoleNames(String(req.query.role || ''));
    return ok(res, 'Users fetched successfully', users);
  }),
);

router.get(
  '/',
  requirePermissions(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (req, res) => {
    const query = parseListQuery(req.query as Record<string, unknown>) as ListQuery;
    const filter = buildSearchFilter(query.search, ['firstName', 'lastName', 'email', 'mobile']);
    const { data, pagination } = await paginate<IUser>(UserModel, filter, query, 'role');
    return ok(res, 'Users fetched successfully', data, pagination);
  }),
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (req, res) => {
    return ok(res, 'User fetched successfully', await getUserOrFail(req.params.id));
  }),
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.USERS_CREATE),
  validate(createUserSchema),
  audit(AuditAction.USER_CREATED, 'users'),
  asyncHandler(async (req, res) => {
    if (await UserModel.findOne({ email: String(req.body.email).toLowerCase() })) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const role = await getRoleOrFail(req.body.role);
    if (role.name === RoleName.OWNER) {
      throw ApiError.badRequest('The Owner role cannot be assigned through user creation');
    }

    const user = await UserModel.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: String(req.body.email).toLowerCase(),
      mobile: req.body.mobile,
      passwordHash: await hashPassword(req.body.password),
      role: role._id,
      status: req.body.status || UserStatus.ACTIVE,
      permissionOverrides: {
        grant: req.body.permissionGrants || [],
        revoke: req.body.permissionRevokes || [],
      },
      createdBy: new Types.ObjectId(req.user!.userId),
    });

    return created(res, 'User created successfully', await getUserOrFail(user.id));
  }),
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(updateUserSchema),
  audit(AuditAction.USER_UPDATED, 'users'),
  asyncHandler(async (req, res) => {
    const user = await getUserOrFail(req.params.id);
    const dto = req.body;

    if (dto.role) {
      const role = await getRoleOrFail(dto.role);
      if (role.name === RoleName.OWNER) throw ApiError.badRequest('The Owner role cannot be assigned');
      user.role = role._id as Types.ObjectId;
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.mobile !== undefined) user.mobile = dto.mobile;
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.email !== undefined && dto.email.toLowerCase() !== user.email) {
      if (await UserModel.findOne({ email: dto.email.toLowerCase() })) {
        throw ApiError.conflict('A user with this email already exists');
      }
      user.email = dto.email.toLowerCase();
    }
    if (dto.permissionGrants !== undefined) user.permissionOverrides.grant = dto.permissionGrants;
    if (dto.permissionRevokes !== undefined) user.permissionOverrides.revoke = dto.permissionRevokes;

    await user.save();
    return ok(res, 'User updated successfully', await getUserOrFail(user.id));
  }),
);

router.patch(
  '/:id/permissions',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(updatePermissionsSchema),
  audit(AuditAction.PERMISSION_CHANGED, 'users'),
  asyncHandler(async (req, res) => {
    const user = await getUserOrFail(req.params.id);
    user.permissionOverrides = { grant: req.body.grant, revoke: req.body.revoke };
    await user.save();
    return ok(res, 'Permissions updated successfully', await getUserOrFail(user.id));
  }),
);

router.patch(
  '/:id/status',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    return ok(res, 'User status updated successfully', await setStatus(req.params.id, req.body.status));
  }),
);

router.post(
  '/:id/activate',
  requirePermissions(PERMISSIONS.USERS_ACTIVATE),
  audit(AuditAction.USER_ACTIVATED, 'users'),
  asyncHandler(async (req, res) => {
    return ok(res, 'User activated successfully', await setStatus(req.params.id, UserStatus.ACTIVE));
  }),
);

router.post(
  '/:id/deactivate',
  requirePermissions(PERMISSIONS.USERS_DEACTIVATE),
  audit(AuditAction.USER_DEACTIVATED, 'users'),
  asyncHandler(async (req, res) => {
    return ok(res, 'User deactivated successfully', await setStatus(req.params.id, UserStatus.INACTIVE));
  }),
);

router.post(
  '/:id/reset-password',
  requirePermissions(PERMISSIONS.USERS_EDIT),
  validate(adminResetPasswordSchema),
  audit(AuditAction.PASSWORD_RESET, 'users'),
  asyncHandler(async (req, res) => {
    const user = await getUserOrFail(req.params.id);
    const temporaryPassword = req.body.newPassword || nanoid(12);

    user.passwordHash = await hashPassword(temporaryPassword);
    user.refreshTokenHash = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    return ok(res, 'Password reset successfully', { temporaryPassword });
  }),
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_DELETE),
  audit(AuditAction.USER_DELETED, 'users'),
  asyncHandler(async (req, res) => {
    const user = await getUserOrFail(req.params.id);
    const role = user.role as unknown as { name: string };
    if (role.name === RoleName.OWNER) throw ApiError.badRequest('The Owner account cannot be deleted');

    await UserModel.deleteOne({ _id: req.params.id });
    return ok(res, 'User deleted successfully', null);
  }),
);

export default router;
