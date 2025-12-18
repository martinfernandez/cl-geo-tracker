import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../../middleware/auth';

export const notificationRouter = Router();

// All notification routes require authentication
notificationRouter.use(authMiddleware);

// Get user notifications
notificationRouter.get('/', NotificationController.getUserNotifications);

// Get unread count
notificationRouter.get('/unread/count', NotificationController.getUnreadCount);

// Mark notification as read
notificationRouter.put('/:notificationId/read', NotificationController.markAsRead);

// Mark all as read
notificationRouter.put('/read/all', NotificationController.markAllAsRead);

// Delete notification
notificationRouter.delete('/:notificationId', NotificationController.deleteNotification);
