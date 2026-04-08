import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IResume {
  name: string;
  content: string; // Base64 content
  contentType: string; // e.g. application/pdf
  type: string;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  bio?: string;
  jobTitle?: string;
  avatar?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    portfolio?: string;
  };
  resumes: IResume[];
  boardColumns: { name: string; color: string }[];
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const resumeSchema = new Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  contentType: { type: String, required: true },
  type: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    bio: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    avatar: { type: String, default: '' },
    socialLinks: {
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      twitter: { type: String, default: '' },
      portfolio: { type: String, default: '' },
    },
    resumes: {
      type: [resumeSchema],
      validate: {
        validator: (v: any[]) => v.length <= 10,
        message: 'You can store a maximum of 10 resumes',
      },
    },
    boardColumns: {
      type: [{
        name: { type: String, required: true },
        color: { type: String, default: '#3b82f6' }
      }],
      default: [
        { name: 'Applied', color: '#64748b' },
        { name: 'Phone Screen', color: '#0ea5e9' },
        { name: 'Interview', color: '#8b5cf6' },
        { name: 'Offer', color: '#10b981' },
        { name: 'Rejected', color: '#ef4444' }
      ]
    },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

export const User = mongoose.model<IUser>('User', userSchema);
