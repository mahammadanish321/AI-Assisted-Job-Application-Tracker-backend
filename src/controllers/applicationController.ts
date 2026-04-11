import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Application } from '../models/Application';
import jobDescriptionService from '../services/jobDescriptionService';
import { AuthRequest } from '../middlewares/auth';
import { Notification } from '../models/Notification';

/**
 * @desc    Get logged in user applications
 * @route   GET /api/applications
 * @access  Private
 */
export const getApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applications = await Application.find({ user: req.user?._id as any }).sort({ dateApplied: -1 });
  res.json(applications);
});

/**
 * @desc    Get application by ID
 * @route   GET /api/applications/:id
 * @access  Private
 */
export const getApplicationById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const application = await Application.findById(req.params.id);

  if (application && application.user.toString() === req.user?._id.toString()) {
    res.json(application);
  } else {
    res.status(404);
    throw new Error('Application not found');
  }
});

/**
 * @desc    Create a new application (Uses AI Service for JD auto-extraction)
 * @route   POST /api/applications
 * @access  Private
 */
export const createApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jdLink, jdText, notes, salaryRange, status, company, role, color, techStack, location, deadline, startDate, isInternship, expectedDuration, strategicNotes, companyLogo } = req.body;

  let extractedDetails: any = { company, role, skills_required: [], skills_nice_to_have: [], seniority: '', location: location || '' };

  // If company & role are already provided (pre-parsed), skip AI extraction
  if (!company || !role) {
    if (!jdText) {
      res.status(400);
      throw new Error('Please provide either company+role or jdText for AI extraction');
    }
    extractedDetails = await jobDescriptionService.extractJobDetails(jdText);
  }

  const application = new Application({
    user: req.user?._id,
    company: extractedDetails.company,
    role: extractedDetails.role,
    jdLink: jdLink || jdText || '',
    notes,
    status: status || 'Applied',
    salaryRange,
    color,
    // Advanced Tracking
    techStack,
    location: extractedDetails.location || location,
    deadline,
    startDate,
    isInternship,
    expectedDuration,
    strategicNotes,
    companyLogo
  });

  const createdApplication = await application.save();
  
  res.status(201).json({
    application: createdApplication,
    extractedSkills: {
      required: extractedDetails.skills_required,
      niceToHave: extractedDetails.skills_nice_to_have
    },
    seniority: extractedDetails.seniority,
    location: extractedDetails.location,
  });
});

/**
 * @desc    Update an application
 * @route   PUT /api/applications/:id
 * @access  Private
 */
export const updateApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  const application = await Application.findById(req.params.id);

  if (application && application.user.toString() === req.user?._id.toString()) {
    application.company = req.body.company || application.company;
    application.role = req.body.role || application.role;
    application.jdLink = req.body.jdLink || application.jdLink;
    application.notes = req.body.notes || application.notes;
    application.status = req.body.status || application.status;
    application.salaryRange = req.body.salaryRange || application.salaryRange;
    application.color = req.body.color || application.color;
    
    // Update advanced tracking fields (allow null/empty values)
    application.techStack = req.body.techStack !== undefined ? req.body.techStack : application.techStack;
    application.location = req.body.location !== undefined ? req.body.location : application.location;
    application.deadline = req.body.deadline !== undefined ? req.body.deadline : application.deadline;
    application.startDate = req.body.startDate !== undefined ? req.body.startDate : application.startDate;
    application.isInternship = req.body.isInternship !== undefined ? req.body.isInternship : application.isInternship;
    application.expectedDuration = req.body.expectedDuration !== undefined ? req.body.expectedDuration : application.expectedDuration;
    application.strategicNotes = req.body.strategicNotes !== undefined ? req.body.strategicNotes : application.strategicNotes;
    application.companyLogo = req.body.companyLogo !== undefined ? req.body.companyLogo : application.companyLogo;

    const updatedApplication = await application.save();

    res.json(updatedApplication);
  } else {
    res.status(404);
    throw new Error('Application not found');
  }
});

/**
 * @desc    Delete an application
 * @route   DELETE /api/applications/:id
 * @access  Private
 */
export const deleteApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  const application = await Application.findById(req.params.id);

  if (application && application.user.toString() === req.user?._id.toString()) {
    await application.deleteOne();
    res.json({ message: 'Application removed' });
  } else {
    res.status(404);
    throw new Error('Application not found');
  }
});

/**
 * @desc    Generate strategic role summary
 * @route   POST /api/applications/summarize
 * @access  Private
 */
export const generateStrategicSummaryAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jdText } = req.body;
  
  if (!jdText) {
    res.status(400);
    throw new Error('Please provide jdText');
  }

  const summary = await jobDescriptionService.generateStrategicSummary(jdText);
  res.json({ summary });
});

/**
 * @desc    Generate resume bullets using AI tailored to JD
 * @route   POST /api/applications/generate-resume
 * @access  Private
 */
export const generateResumeAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jdText, userExperience } = req.body;
  
  if (!jdText || !userExperience) {
    res.status(400);
    throw new Error('Please provide both jdText and userExperience');
  }

  const bullets = await jobDescriptionService.generateResumeBullets(jdText, userExperience);
  res.json({ bullets });
});

/**
 * @desc    Parse JD without saving to Database
 * @route   POST /api/applications/parse
 * @access  Private
 */
export const parseJobDescriptionAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jdText } = req.body;
  if (!jdText) {
    res.status(400);
    throw new Error('Please provide jdText parameter');
  }

  const extractedDetails = await jobDescriptionService.extractJobDetails(jdText);
  res.json({
    ...extractedDetails,
    provider: extractedDetails.provider || (process.env.AI_PROVIDER || 'gemini').toUpperCase()
  });
});
/**
 * @desc    Stream resume bullets using AI
 * @route   GET /api/applications/stream-resume
 * @access  Private
 */
export const streamResumeBulletsAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jdText, userExperience } = req.query as { jdText: string; userExperience: string };
  
  if (!jdText || !userExperience) {
    res.status(400);
    throw new Error('Please provide both jdText and userExperience in query params');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const provider = process.env.AI_PROVIDER?.toUpperCase() || 'GEMINI';
    console.log(`[StreamResume] Starting bullet generation via ${provider}`);
    
    const stream = jobDescriptionService.streamResumeBullets(jdText, userExperience);
    for await (const bullet of stream) {
      res.write(`data: ${JSON.stringify({ bullet })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Streaming error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Streaming failed' })}\n\n`);
    res.end();
  }
});
