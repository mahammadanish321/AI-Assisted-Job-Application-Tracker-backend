import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken';

// Helper function to set the refresh token in an HttpOnly cookie
const setRefreshTokenCookie = (res: Response, token: string) => {
  const expiresInDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '7');
  
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // HTTPS in production
    sameSite: 'strict',
    maxAge: expiresInDays * 24 * 60 * 60 * 1000, 
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({ name, email, password });

  if (user) {
    const accessToken = generateAccessToken((user._id as unknown) as string);
    const refreshToken = generateRefreshToken((user._id as unknown) as string);

    setRefreshTokenCookie(res, refreshToken);

    /* 
    // Create welcome notification
    await Notification.create({
      user: user._id,
      type: 'SYSTEM',
      message: `Welcome to Soon! Start tracking your job applications today.`,
      link: '/dashboard',
    });
    */

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accessToken,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

/**
 * @desc    Auth user & get tokens
 * @route   POST /api/auth/login
 * @access  Public
 */
export const authUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    const accessToken = generateAccessToken((user._id as unknown) as string);
    const refreshToken = generateRefreshToken((user._id as unknown) as string);

    setRefreshTokenCookie(res, refreshToken);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accessToken,
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

/**
 * @desc    Refresh access token using HttpOnly cookie
 * @route   POST /api/auth/refresh
 * @access  Public
 */
export const refreshTokens = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.jwt;

  if (!refreshToken) {
    res.status(401);
    throw new Error('No refresh token provided in cookies');
  }

  try {
    const secret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
    const decoded = jwt.verify(refreshToken, secret) as any;

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    const accessToken = generateAccessToken((user._id as unknown) as string);
    
    // Rotating the refresh token
    const newRefreshToken = generateRefreshToken((user._id as unknown) as string);
    setRefreshTokenCookie(res, newRefreshToken);

    res.json({ accessToken });
  } catch (error) {
    res.status(403);
    throw new Error('Invalid or expired refresh token');
  }
});

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  
  res.status(200).json({ message: 'Logged out successfully' });
});

/**
 * @desc    Google Auth (Login/Signup)
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuthUser = asyncHandler(async (req: Request, res: Response) => {
  const { googleAccessToken } = req.body;

  if (!googleAccessToken) {
    res.status(400);
    throw new Error('Google Access Token is required');
  }

  // Verify and fetch user info from Google
  const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${googleAccessToken}` }
  });

  if (!googleRes.ok) {
    res.status(401);
    throw new Error('Invalid Google Access Token');
  }

  const userProfile: any = await googleRes.json();
  const { email, name, picture } = userProfile;

  if (!email) {
    res.status(400);
    throw new Error('Email not found in Google profile');
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      avatar: picture || '',
    });
  } else {
    if (!user.avatar && picture) {
      user.avatar = picture;
      await user.save();
    }
  }

  const accessToken = generateAccessToken((user._id as unknown) as string);
  const refreshToken = generateRefreshToken((user._id as unknown) as string);

  setRefreshTokenCookie(res, refreshToken);

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    accessToken,
  });
});
