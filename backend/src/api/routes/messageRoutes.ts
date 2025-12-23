import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authMiddleware } from '../../middleware/auth';

export const messageRouter = Router();

// All message routes require authentication
messageRouter.post('/conversations', authMiddleware, MessageController.getOrCreateConversation);
messageRouter.get('/conversations', authMiddleware, MessageController.getUserConversations);
messageRouter.get('/conversations/:id', authMiddleware, MessageController.getConversation);
messageRouter.post('/conversations/:id/messages', authMiddleware, MessageController.sendMessage);
messageRouter.put('/conversations/:id/read', authMiddleware, MessageController.markMessagesAsRead);
messageRouter.get('/messages/unread/count', authMiddleware, MessageController.getUnreadCount);
messageRouter.get('/events/:eventId/conversations', authMiddleware, MessageController.getEventConversations);
