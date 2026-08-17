import { Schema, model, Document, Types } from 'mongoose';
import { FollowUpStatus } from '../constants/enums.constant';

export interface IFollowUp extends Document {
  enquiry: Types.ObjectId;
  followUpDate: Date;
  followUpTime?: string;
  notes?: string;
  status: FollowUpStatus;
  assignedUser: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const followUpSchema = new Schema<IFollowUp>(
  {
    enquiry: { type: Schema.Types.ObjectId, ref: 'Enquiry', required: true, index: true },
    followUpDate: { type: Date, required: true },
    followUpTime: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: Object.values(FollowUpStatus), default: FollowUpStatus.PENDING, index: true },
    assignedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const FollowUpModel = model<IFollowUp>('FollowUp', followUpSchema);
