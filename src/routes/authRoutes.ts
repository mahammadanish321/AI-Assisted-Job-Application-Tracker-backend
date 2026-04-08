import express from 'express';
import { registerUser, authUser, refreshTokens, logoutUser, googleAuthUser } from '../controllers/authController';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/google', googleAuthUser);
router.post('/refresh', refreshTokens);
router.post('/logout', logoutUser);

export default router;
