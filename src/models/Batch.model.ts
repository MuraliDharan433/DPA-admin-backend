import { Schema, model, Document, Types } from 'mongoose';
import { BatchStatus } from '../constants/enums.constant';

export interface IBatch extends Document {
  name: string;
  course: Types.ObjectId;
  trainer?: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  timing?: string;
  capacity: number;
  status: BatchStatus;
  createdAt: Date;
}

const batchSchema = new Schema<IBatch>(
  {
    name: { type: String, required: true, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    trainer: { type: Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    timing: { type: String, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(BatchStatus), default: BatchStatus.UPCOMING, index: true },
  },
  { timestamps: true },
);

export const BatchModel = model<IBatch>('Batch', batchSchema);
