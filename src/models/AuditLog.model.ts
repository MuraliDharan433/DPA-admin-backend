import { Schema, model, Document, Types } from 'mongoose';
import { AuditAction } from '../constants/enums.constant';

export interface IAuditLog extends Document {
  user?: Types.ObjectId;
  action: AuditAction;
  module: string;
  recordId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, enum: Object.values(AuditAction), required: true, index: true },
    module: { type: String, required: true, index: true },
    recordId: String,
    ipAddress: String,
    userAgent: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);
