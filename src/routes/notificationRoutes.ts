import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  syncGmailAction,
} from '../controllers/notificationController';
import { protect } from '../middlewares/auth';

const router = express.Router();

router.use(protect);

router.route('/').get(getNotifications);
router.route('/sync-gmail').post(syncGmailAction);
router.route('/read-all').put(markAllAsRead);
router.route('/unread-count').get(getUnreadCount);
router.route('/:id/read').put(markAsRead);
router.route('/:id').delete(deleteNotification);

export default router;
