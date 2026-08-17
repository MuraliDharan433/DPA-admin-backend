import { Schema, model, Document, Types } from 'mongoose';
import { Gender, PlacementStatus, StudentType, TrainingStatus } from '../constants/enums.constant';

export interface IStudentNote {
  text: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface IWorkHistoryEntry {
  company: string;
  role?: string;
  years?: number;
}

export interface ICompletedModule {
  module: string;
  completedAt: Date;
}

export interface IFeePayment {
  amount: number;
  /** Which instalment this covers, e.g. "Term 1" / "Admission fee". */
  term?: string;
  /** Which account received the money, e.g. "HDFC Bank", "Cash", "UPI". */
  account?: string;
  /** When the student actually paid. */
  paymentDate: Date;
  notes?: string;
  /** Who entered this payment, and when they entered it. */
  recordedBy: Types.ObjectId;
  recordedAt: Date;
}

export interface IStudent extends Document {
  studentId: string;
  firstName: string;
  lastName: string;
  dob?: Date;
  gender?: Gender;
  email: string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  highestQualification?: string;
  college?: string;
  university?: string;
  graduationYear?: number;
  percentage?: number;
  skills: string[];
  course: Types.ObjectId;
  batch?: Types.ObjectId;
  joiningDate?: Date;
  courseStartDate?: Date;
  courseEndDate?: Date;
  trainingStatus: TrainingStatus;
  /** Classes (from the enrolled course's `modules` list) this student has finished, with the date each was completed. */
  completedModules: ICompletedModule[];
  studentType: StudentType;
  /** Only meaningful when studentType is EXPERIENCED. */
  lastCompany?: string;
  totalYearsExperience?: number;
  pfStatus?: boolean;
  workHistory: IWorkHistoryEntry[];
  /** Agreed course fee for this student; individual payments live in feePayments. */
  totalFees?: number;
  feePayments: IFeePayment[];
  placementStatus: PlacementStatus;
  currentCompany?: string;
  jobTitle?: string;
  package?: number;
  placementDate?: Date;
  sourceEnquiry?: Types.ObjectId;
  createdBy: Types.ObjectId;
  notes: IStudentNote[];
  createdAt: Date;
}

const studentNoteSchema = new Schema<IStudentNote>(
  {
    text: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const workHistoryEntrySchema = new Schema<IWorkHistoryEntry>(
  {
    company: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    years: Number,
  },
  { _id: false },
);

const completedModuleSchema = new Schema<ICompletedModule>(
  {
    module: { type: String, required: true, trim: true },
    completedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

// Keeps its own _id so a single mistaken payment entry can be deleted by id.
const feePaymentSchema = new Schema<IFeePayment>({
  amount: { type: Number, required: true, min: 0 },
  term: { type: String, trim: true },
  account: { type: String, trim: true },
  paymentDate: { type: Date, required: true },
  notes: { type: String, trim: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recordedAt: { type: Date, required: true, default: () => new Date() },
});

const studentSchema = new Schema<IStudent>(
  {
    studentId: { type: String, required: true, unique: true, index: true },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: Date,
    gender: { type: String, enum: Object.values(Gender) },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    alternateMobile: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true },

    highestQualification: { type: String, trim: true },
    college: { type: String, trim: true },
    university: { type: String, trim: true },
    graduationYear: Number,
    percentage: Number,
    skills: { type: [String], default: [] },

    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
    joiningDate: Date,
    courseStartDate: Date,
    courseEndDate: Date,
    trainingStatus: {
      type: String,
      enum: Object.values(TrainingStatus),
      default: TrainingStatus.ENROLLED,
      index: true,
    },
    completedModules: { type: [completedModuleSchema], default: [] },
    studentType: { type: String, enum: Object.values(StudentType), default: StudentType.FRESHER, index: true },
    lastCompany: { type: String, trim: true },
    totalYearsExperience: Number,
    pfStatus: Boolean,
    workHistory: { type: [workHistoryEntrySchema], default: [] },

    totalFees: Number,
    feePayments: { type: [feePaymentSchema], default: [] },

    placementStatus: {
      type: String,
      enum: Object.values(PlacementStatus),
      default: PlacementStatus.NOT_LOOKING,
      index: true,
    },
    currentCompany: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    package: Number,
    placementDate: Date,

    sourceEnquiry: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: [studentNoteSchema], default: [] },
  },
  { timestamps: true },
);

studentSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

export const StudentModel = model<IStudent>('Student', studentSchema);
