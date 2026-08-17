import { Schema, model, Document, Types } from 'mongoose';

export interface IResume extends Document {
  student: Types.ObjectId;
  fileName: string;
  fileKey: string;
  fileUrl?: string;
  fileType: string;
  fileSize: number;
  version: number;
  isActive: boolean;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    fileName: { type: String, required: true },
    fileKey: { type: String, required: true },
    fileUrl: String,
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

resumeSchema.index({ student: 1, version: -1 });

export const ResumeModel = model<IResume>('Resume', resumeSchema);
