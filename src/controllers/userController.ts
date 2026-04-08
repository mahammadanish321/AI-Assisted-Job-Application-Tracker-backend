import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { generateSignature } from '../utils/cloudinary';

/**
 * @desc    Get Cloudinary signature for secure uploads
 * @route   GET /api/users/cloudinary-signature
 * @access  Private
 */
export const getCloudinarySignature = asyncHandler(async (req: AuthRequest, res: Response) => {
  const folder = req.query.folder as string || 'soon_assets';
  const signatureData = generateSignature(folder);
  res.json({ ...signatureData, folder });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?._id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.name = req.body.name || user.name;
  user.bio = req.body.bio ?? user.bio;
  user.jobTitle = req.body.jobTitle ?? user.jobTitle;
  user.avatar = req.body.avatar ?? user.avatar;
  user.socialLinks = req.body.socialLinks ?? user.socialLinks;
  user.boardColumns = req.body.boardColumns ?? user.boardColumns;

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updated = await user.save();
  const { password: _, ...userObj } = updated.toObject();
  res.json(userObj);
});

/**
 * @desc    Add a resume
 * @route   POST /api/users/resumes
 * @access  Private
 */
export const addResume = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.resumes.length >= 10) {
    res.status(400);
    throw new Error('Maximum of 10 resumes allowed');
  }

  const { name, content, contentType, type } = req.body;
  if (!name || !content || !contentType) {
    res.status(400);
    throw new Error('Name, Content, and ContentType are required');
  }

  user.resumes.push({ name, content, contentType, type: type || 'General', createdAt: new Date() });
  await user.save();

  res.status(201).json(user.resumes);
});

/**
 * @desc    Delete a resume
 * @route   DELETE /api/users/resumes/:resumeId
 * @access  Private
 */
export const deleteResume = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const before = user.resumes.length;
  user.resumes = user.resumes.filter(
    (r: any) => r._id.toString() !== req.params.resumeId
  );

  if (user.resumes.length === before) {
    res.status(404);
    throw new Error('Resume not found');
  }

  await user.save();
  res.json(user.resumes);
});
