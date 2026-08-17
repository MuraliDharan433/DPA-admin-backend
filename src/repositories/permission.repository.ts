import { PermissionModel } from '../models/Permission.model';
import { PERMISSION_GROUPS } from '../constants/permissions.constant';

export const permissionRepository = {
  findAll() {
    return PermissionModel.find().sort({ group: 1, key: 1 });
  },

  async ensureSeeded() {
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
  },
};
