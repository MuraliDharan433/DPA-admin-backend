import { RoleModel } from '../models/Role.model';
import { DEFAULT_ROLE_PERMISSIONS, RoleName } from '../constants/roles.constant';

export const roleRepository = {
  findAll() {
    return RoleModel.find().sort({ isSystem: -1, name: 1 });
  },

  findById(id: string) {
    return RoleModel.findById(id);
  },

  findByName(name: string) {
    return RoleModel.findOne({ name });
  },

  findByNames(names: string[]) {
    return RoleModel.find({ name: { $in: names } });
  },

  create(data: { name: string; description?: string; permissions: string[] }) {
    return RoleModel.create({ ...data, isSystem: false });
  },

  deleteById(id: string) {
    return RoleModel.deleteOne({ _id: id });
  },

  async ensureSeeded() {
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
      // Additive migration: union in any new default permission keys this role should have
      // (e.g. after a code update adds a new module) without touching any custom grants/revokes
      // the Owner has already made via the permission matrix.
      if (existing.isSystem) {
        const missing = DEFAULT_ROLE_PERMISSIONS[roleName].filter(
          (p) => !existing.permissions.includes(p),
        );
        if (missing.length > 0) {
          existing.permissions = [...existing.permissions, ...missing];
          await existing.save();
        }
      }
    }
  },
};
