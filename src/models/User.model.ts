import { Schema, model, Document, Types } from 'mongoose';
import { UserStatus } from '../constants/enums.constant';
import type { PermissionKey } from '../constants/permissions.constant';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  passwordHash: string;
  role: Types.ObjectId;
  permissionOverrides: { grant: PermissionKey[]; revoke: PermissionKey[] };
  status: UserStatus;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  refreshTokenHash?: string;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    permissionOverrides: {
      grant: { type: [String], default: [] },
      revoke: { type: [String], default: [] },
    },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE, index: true },
    lastLoginAt: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    refreshTokenHash: { type: String, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Never leak secrets even if a route accidentally returns a raw document.
userSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    delete ret.refreshTokenHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    return ret;
  },
});

export const UserModel = model<IUser>('User', userSchema);
