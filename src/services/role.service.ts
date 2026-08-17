import { roleRepository } from '../repositories/role.repository';
import { ApiError } from '../utils/apiResponse';
import { RoleName } from '../constants/roles.constant';
import type { PermissionKey } from '../constants/permissions.constant';

export const roleService = {
  findAll() {
    return roleRepository.findAll();
  },

  async findById(id: string) {
    const role = await roleRepository.findById(id);
    if (!role) throw ApiError.notFound('Role not found');
    return role;
  },

  findByName(name: string) {
    return roleRepository.findByName(name);
  },

  findByNames(names: string[]) {
    return roleRepository.findByNames(names);
  },

  async create(data: { name: string; description?: string; permissions: PermissionKey[] }) {
    const existing = await roleRepository.findByName(data.name);
    if (existing) throw ApiError.conflict('A role with this name already exists');
    return roleRepository.create(data);
  },

  async update(id: string, data: { name?: string; description?: string; permissions?: PermissionKey[] }) {
    const role = await this.findById(id);
    if (role.name === RoleName.OWNER) {
      throw ApiError.badRequest('The Owner role has full access by design and cannot be modified');
    }
    if (data.name && data.name !== role.name && role.isSystem) {
      throw ApiError.badRequest('Built-in role names cannot be changed');
    }
    Object.assign(role, data);
    await role.save();
    return role;
  },

  async delete(id: string) {
    const role = await this.findById(id);
    if (role.isSystem) throw ApiError.badRequest('Built-in roles cannot be deleted');
    await roleRepository.deleteById(id);
  },

  ensureSeeded() {
    return roleRepository.ensureSeeded();
  },
};
