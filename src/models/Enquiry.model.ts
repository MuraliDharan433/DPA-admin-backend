import { Schema, model, Document, Types } from 'mongoose';
import { EnquirySource, EnquiryStatus } from '../constants/enums.constant';

export interface IEnquiry extends Document {
  name: string;
  email: string;
  mobile: string;
  course?: string;
  message?: string;
  status: EnquiryStatus;
  source: EnquirySource;
  assignedTo?: Types.ObjectId;
  convertedToStudent?: Types.ObjectId;
  lastFollowUpAt?: Date;
  createdBy?: Types.ObjectId;
  ipAddress?: string;
  createdAt: Date;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    course: { type: String, trim: true },
    message: { type: String, trim: true },
    status: { type: String, enum: Object.values(EnquiryStatus), default: EnquiryStatus.NEW, index: true },
    source: { type: String, enum: Object.values(EnquirySource), default: EnquirySource.WEBSITE },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    convertedToStudent: { type: Schema.Types.ObjectId, ref: 'Student' },
    lastFollowUpAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ipAddress: String,
  },
  { timestamps: true },
);

enquirySchema.index({ createdAt: -1 });

export const EnquiryModel = model<IEnquiry>('Enquiry', enquirySchema);
