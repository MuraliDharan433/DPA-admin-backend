import { nanoid } from 'nanoid';
import { Types } from 'mongoose';
import { userRepository } from '../repositories/user.repository';
import { roleService } from './role.service';
import { ApiError } from '../utils/apiResponse';
import { hashPassword } from '../utils/password';
import { computeEffectivePermissions } from '../utils/effectivePermissions';
import { UserStatus } from '../constants/enums.constant';
import { RoleName } from '../constants/roles.constant';
import type { PermissionKey } from '../constants/permissions.constant';
import type { ListQuery } from '../utils/pagination';
import type { IUser } from '../models/User.model';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
  password: string;
  status?: UserStatus;
  permissionGrants?: PermissionKey[];
  permissionRevokes?: PermissionKey[];
}

export const userService = {
  findAll(query: ListQuery) {
    return userRepository.findAll(query);
  },

  async findById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  findByEmailWithSecrets(email: string) {
    return userRepository.findByEmailWithSecrets(email);
  },

  async create(dto: CreateUserInput, createdBy: string) {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw ApiError.conflict('A user with this email already exists');

    const role = await roleService.findById(dto.role);
    if (role.name === RoleName.OWNER) {
      throw ApiError.badRequest('The Owner role cannot be assigned through user creation');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      mobile: dto.mobile,
      passwordHash,
      role: role._id as Types.ObjectId,
      status: dto.status || UserStatus.ACTIVE,
      permissionOverrides: {
        grant: dto.permissionGrants || [],
        revoke: dto.permissionRevokes || [],
      },
      createdBy: new Types.ObjectId(createdBy),
    });
    return this.findById(user.id);
  },

  async update(id: string, dto: Partial<CreateUserInput>) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');

    if (dto.role) {
      const role = await roleService.findById(dto.role);
      if (role.name === RoleName.OWNER) throw ApiError.badRequest('The Owner role cannot be assigned');
      user.role = role._id as Types.ObjectId;
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.mobile !== undefined) user.mobile = dto.mobile;
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.email !== undefined && dto.email.toLowerCase() !== user.email) {
      const existing = await userRepository.findByEmail(dto.email);
      if (existing) throw ApiError.conflict('A user with this email already exists');
      user.email = dto.email.toLowerCase();
    }
    if (dto.permissionGrants !== undefined) user.permissionOverrides.grant = dto.permissionGrants;
    if (dto.permissionRevokes !== undefined) user.permissionOverrides.revoke = dto.permissionRevokes;

    await user.save();
    return this.findById(user.id);
  },

  async updatePermissions(id: string, grant: PermissionKey[], revoke: PermissionKey[]) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    user.permissionOverrides = { grant, revoke };
    await user.save();
    return this.findById(user.id);
  },

  async updateStatus(id: string, status: UserStatus) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    const role = user.role as unknown as { name: string };
    if (role.name === RoleName.OWNER) throw ApiError.badRequest('The Owner account status cannot be changed');
    user.status = status;
    if (status !== UserStatus.SUSPENDED) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
    }
    await user.save();
    return this.findById(user.id);
  },

  async delete(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    const role = user.role as unknown as { name: string };
    if (role.name === RoleName.OWNER) throw ApiError.badRequest('The Owner account cannot be deleted');
    await userRepository.deleteById(id);
  },

  async adminResetPassword(id: string, newPassword?: string) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    const tempPassword = newPassword || nanoid(12);
    user.passwordHash = await hashPassword(tempPassword);
    user.refreshTokenHash = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    return tempPassword;
  },

  async setPassword(userId: string, passwordHash: string) {
    await userRepository.updateById(userId, { passwordHash, refreshTokenHash: undefined });
  },

  async recordSuccessfulLogin(userId: string) {
    await userRepository.updateById(userId, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });
  },

  async recordFailedLogin(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) return;
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
  },

  async setRefreshTokenHash(userId: string, hash: string | null) {
    await userRepository.updateById(userId, { refreshTokenHash: hash ?? undefined });
  },

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    await userRepository.updateById(userId, { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt });
  },

  findByPasswordResetTokenHash(tokenHash: string) {
    return userRepository.findByPasswordResetTokenHash(tokenHash);
  },

  async clearPasswordResetToken(userId: string) {
    await userRepository.updateById(userId, { passwordResetTokenHash: undefined, passwordResetExpiresAt: undefined });
  },

  /** Accepts a single role name or a comma-separated list (e.g. "COUNSELOR,ADMIN"). */
  async lookupByRoleName(roleName: string) {
    const names = roleName.split(',').map((n) => n.trim()).filter(Boolean);
    if (!names.length) return [];
    const roles = await roleService.findByNames(names);
    if (!roles.length) return [];
    return userRepository.findByRoleIds(roles.map((r) => String(r._id)));
  },

  /** Only used by the seed script - the regular create() path deliberately refuses to assign OWNER. */
  async createOwnerIfNotExists(params: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    password: string;
    roleId: Types.ObjectId;
  }) {
    const existing = await userRepository.findByEmail(params.email);
    if (existing) return existing;

    const passwordHash = await hashPassword(params.password);
    return userRepository.create({
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email.toLowerCase(),
      mobile: params.mobile,
      passwordHash,
      role: params.roleId,
      status: UserStatus.ACTIVE,
    });
  },

  getEffectivePermissions(user: IUser): PermissionKey[] {
    const role = user.role as unknown as { name: string; permissions: PermissionKey[] };
    return computeEffectivePermissions({ name: role.name, permissions: role.permissions }, user);
  },
};
