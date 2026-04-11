import express from 'express';
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  generateResumeAction,
  parseJobDescriptionAction,
  streamResumeBulletsAction,
  generateStrategicSummaryAction,
} from '../controllers/applicationController';
import { protect } from '../middlewares/auth';

const router = express.Router();

router.route('/').get(protect, getApplications).post(protect, createApplication);
router.route('/parse').post(protect, parseJobDescriptionAction);
router.route('/summarize').post(protect, generateStrategicSummaryAction);
router.route('/generate-resume').post(protect, generateResumeAction);
router.route('/stream-resume').get(protect, streamResumeBulletsAction);
router
  .route('/:id')
  .get(protect, getApplicationById)
  .put(protect, updateApplication)
  .delete(protect, deleteApplication);

export default router;
