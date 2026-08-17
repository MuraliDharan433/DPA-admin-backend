import { Schema, model, Document } from 'mongoose';
import type { PermissionKey } from '../constants/permissions.constant';

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: PermissionKey[];
  isSystem: boolean;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, trim: true },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const RoleModel = model<IRole>('Role', roleSchema);
