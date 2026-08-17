import { Schema, model, Document, Types } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  instituteName: string;
  instituteEmail?: string;
  institutePhone?: string;
  instituteAddress?: string;
  updatedBy?: Types.ObjectId;
}

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    instituteName: { type: String, default: 'My Institute' },
    instituteEmail: String,
    institutePhone: String,
    instituteAddress: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const SettingModel = model<ISetting>('Setting', settingSchema);
