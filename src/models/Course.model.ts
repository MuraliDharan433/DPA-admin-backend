import { Schema, model, Document } from 'mongoose';
import { CourseMode, CourseStatus } from '../constants/enums.constant';

export interface ICourse extends Document {
  name: string;
  code: string;
  description?: string;
  duration: string;
  fee: number;
  mode: CourseMode;
  status: CourseStatus;
  /** Ordered class/topic breakdown of the course (e.g. HTML, CSS, JavaScript for a Web Developer course),
   * used to track which classes each enrolled student has completed. */
  modules: string[];
  createdAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    duration: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: Object.values(CourseMode), required: true },
    status: { type: String, enum: Object.values(CourseStatus), default: CourseStatus.ACTIVE },
    modules: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const CourseModel = model<ICourse>('Course', courseSchema);
