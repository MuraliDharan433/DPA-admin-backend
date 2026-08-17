import { Schema, model, Document, Types } from 'mongoose';
import { InterviewStatus, InterviewResult } from '../constants/enums.constant';

export interface IInterview extends Document {
  application: Types.ObjectId;
  student: Types.ObjectId;
  interviewDate: Date;
  round?: string;
  status: InterviewStatus;
  result: InterviewResult;
  interviewer?: string;
  feedback?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const interviewSchema = new Schema<IInterview>(
  {
    application: { type: Schema.Types.ObjectId, ref: 'JobApplication', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    interviewDate: { type: Date, required: true },
    round: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(InterviewStatus),
      default: InterviewStatus.SCHEDULED,
      index: true,
    },
    result: {
      type: String,
      enum: Object.values(InterviewResult),
      default: InterviewResult.PENDING,
      index: true,
    },
    interviewer: { type: String, trim: true },
    feedback: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const InterviewModel = model<IInterview>('Interview', interviewSchema);
