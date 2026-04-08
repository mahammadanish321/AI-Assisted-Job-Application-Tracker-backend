import express from 'express';
import { protect } from '../middlewares/auth';
import { getProfile, updateProfile, addResume, deleteResume, getCloudinarySignature } from '../controllers/userController';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/resumes', protect, addResume);
router.delete('/resumes/:resumeId', protect, deleteResume);
router.get('/cloudinary-signature', protect, getCloudinarySignature);

export default router;
