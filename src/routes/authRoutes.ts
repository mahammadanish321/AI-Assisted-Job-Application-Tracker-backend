import express from 'express';
import { registerUser, authUser, refreshTokens, logoutUser } from '../controllers/authController';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/refresh', refreshTokens);
router.post('/logout', logoutUser);

export default router;
