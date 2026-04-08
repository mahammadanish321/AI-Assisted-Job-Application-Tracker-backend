export interface IApplication {
  company: string;
  role: string;
  jdLink?: string;
  notes?: string;
  status: 'Applied' | 'Phone Screen' | 'Interview' | 'Offer' | 'Rejected';
  dateApplied: Date;
  salaryRange?: string;
  user: string; // User ID reference
}

export interface IAIResumeResponse {
  company: string;
  role: string;
  skills_required: string[];
  skills_nice_to_have: string[];
  seniority: string;
  location: string;
}
