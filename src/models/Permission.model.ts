import { Schema, model, Document } from 'mongoose';

export interface IPermission extends Document {
  key: string;
  label: string;
  group: string;
}

const permissionSchema = new Schema<IPermission>(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    group: { type: String, required: true },
  },
  { timestamps: true },
);

export const PermissionModel = model<IPermission>('Permission', permissionSchema);
