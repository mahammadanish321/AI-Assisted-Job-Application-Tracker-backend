import mongoose, { Schema, Document } from 'mongoose';

export interface IApplicationDoc extends Document {
  company: string;
  role: string;
  jdLink?: string;
  notes?: string;
  status: string; // Relaxed to support dynamic columns
  dateApplied: Date;
  salaryRange?: string;
  color?: string; // Application-specific color
  user: mongoose.Schema.Types.ObjectId;
  
  // New Fields
  techStack?: string;
  location?: string;
  deadline?: Date;
  startDate?: Date;
  isInternship?: boolean;
  expectedDuration?: string;
  strategicNotes?: string;
  companyLogo?: string;
}

const applicationSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    company: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    jdLink: {
      type: String,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      default: 'Applied',
      required: true,
    },
    dateApplied: {
      type: Date,
      default: Date.now,
      required: true,
    },
    salaryRange: {
      type: String,
    },
    color: {
      type: String,
      default: () => '#' + Math.floor(Math.random()*16777215).toString(16)
    },
    // Advanced Tracking Fields
    techStack: String,
    location: String,
    deadline: Date,
    startDate: Date,
    isInternship: { type: Boolean, default: false },
    expectedDuration: String,
    strategicNotes: String,
    companyLogo: String,
  },
  {
    timestamps: true,
  }
);

export const Application = mongoose.model<IApplicationDoc>(
  'Application',
  applicationSchema
);
