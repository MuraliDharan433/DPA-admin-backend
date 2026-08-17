import { Schema, model, Document, Types } from 'mongoose';
import { JobApplicationStatus } from '../constants/enums.constant';

export interface IJobApplication extends Document {
  student: Types.ObjectId;
  company: Types.ObjectId;
  jobTitle: string;
  package?: number;
  applicationDate: Date;
  status: JobApplicationStatus;
  offerDate?: Date;
  joiningDate?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    jobTitle: { type: String, required: true, trim: true },
    package: Number,
    applicationDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(JobApplicationStatus),
      default: JobApplicationStatus.APPLIED,
      index: true,
    },
    offerDate: Date,
    joiningDate: Date,
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const JobApplicationModel = model<IJobApplication>('JobApplication', jobApplicationSchema);
