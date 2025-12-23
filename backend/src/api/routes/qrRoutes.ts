import { Router } from 'express';
import { QRController } from '../controllers/qrController';
import { authMiddleware } from '../../middleware/auth';

export const qrRouter = Router();

// ==================
// PUBLIC ENDPOINTS (no auth required)
// ==================

// Get device info by QR code
qrRouter.get('/public/:qrCode/info', QRController.getDeviceByQR);

// Start anonymous chat
qrRouter.post('/public/:qrCode/chat', QRController.startAnonymousChat);

// Get messages for anonymous session
qrRouter.get('/public/chat/:chatId/session/:sessionId', QRController.getAnonymousMessages);

// Send message as anonymous user
qrRouter.post('/public/chat/:chatId/session/:sessionId/message', QRController.sendAnonymousMessage);

// ==================
// AUTHENTICATED ENDPOINTS - Owner operations
// ==================

// Get all found object chats (as owner)
qrRouter.get('/found-chats', authMiddleware, QRController.getFoundChats);

// Get specific chat (as owner)
qrRouter.get('/found-chats/:chatId', authMiddleware, QRController.getFoundChat);

// Send message as owner
qrRouter.post('/found-chats/:chatId/message', authMiddleware, QRController.sendOwnerMessage);

// Update chat status (mark as resolved/closed)
qrRouter.put('/found-chats/:chatId/status', authMiddleware, QRController.updateChatStatus);

// ==================
// AUTHENTICATED ENDPOINTS - Finder operations (registered users)
// ==================

// Start chat as registered user who found object
qrRouter.post('/contact/:qrCode', authMiddleware, QRController.startRegisteredChat);

// Get chats where user is the finder
qrRouter.get('/my-finds', authMiddleware, QRController.getFinderChats);

// Send message as registered finder
qrRouter.post('/my-finds/:chatId/message', authMiddleware, QRController.sendFinderMessage);
