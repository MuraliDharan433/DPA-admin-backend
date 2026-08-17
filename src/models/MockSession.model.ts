import { Schema, model, Document, Types } from 'mongoose';

export enum MockSessionType {
  MOCK_INTERVIEW = 'MOCK_INTERVIEW',
  MOCK_TEST = 'MOCK_TEST',
}

export interface IMockSession extends Document {
  student: Types.ObjectId;
  type: MockSessionType;
  date: Date;
  trainer: Types.ObjectId;
  feedback?: string;
  rating: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const mockSessionSchema = new Schema<IMockSession>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    type: { type: String, enum: Object.values(MockSessionType), required: true },
    date: { type: Date, required: true },
    trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    feedback: { type: String, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

mockSessionSchema.index({ student: 1, date: -1 });

export const MockSessionModel = model<IMockSession>('MockSession', mockSessionSchema);
