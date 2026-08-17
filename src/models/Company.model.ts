import { Schema, model, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  createdAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true, index: true },
    website: { type: String, trim: true },
    industry: { type: String, trim: true },
    location: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

export const CompanyModel = model<ICompany>('Company', companySchema);
