import express from 'express';
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  generateResumeAction,
  parseJobDescriptionAction,
} from '../controllers/applicationController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.route('/').get(protect, getApplications).post(protect, createApplication);
router.route('/parse').post(protect, parseJobDescriptionAction);
router.route('/generate-resume').post(protect, generateResumeAction);
router
  .route('/:id')
  .get(protect, getApplicationById)
  .put(protect, updateApplication)
  .delete(protect, deleteApplication);

export default router;
