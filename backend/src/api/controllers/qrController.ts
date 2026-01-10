import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { sendPushNotification } from '../../services/pushNotificationService';
import { sendToUser } from '../../websocket/wsServer';
import crypto from 'crypto';

export class QRController {
  // PUBLIC: Get device info by QR code (no personal data)
  static async getDeviceByQR(req: Request, res: Response) {
    try {
      const { qrCode } = req.params;

      const device = await prisma.device.findUnique({
        where: { qrCode },
        select: {
          id: true,
          name: true,
          type: true,
          qrEnabled: true,
        },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      if (!device.qrEnabled) {
        return res.status(403).json({ error: 'QR code is disabled for this device' });
      }

      res.json({
        deviceName: device.name,
        deviceType: device.type,
      });
    } catch (error) {
      console.error('Error getting device by QR:', error);
      res.status(500).json({ error: 'Failed to get device info' });
    }
  }

  // PUBLIC: Start anonymous chat
  static async startAnonymousChat(req: Request, res: Response) {
    try {
      const { qrCode } = req.params;
      const { finderName, message } = req.body;

      const device = await prisma.device.findUnique({
        where: { qrCode },
        include: {
          user: {
            select: {
              id: true,
              expoPushToken: true,
            },
          },
        },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      if (!device.qrEnabled) {
        return res.status(403).json({ error: 'QR code is disabled for this device' });
      }

      if (!device.userId || !device.user) {
        return res.status(400).json({ error: 'Device has no owner' });
      }

      // Generate session ID for anonymous user
      const sessionId = crypto.randomUUID();

      // Create chat
      const chat = await prisma.foundObjectChat.create({
        data: {
          deviceId: device.id,
          ownerId: device.userId,
          finderSessionId: sessionId,
          finderName: finderName || 'Anónimo',
        },
      });

      // Create initial message
      const initialMessage = message || `¡Hola! Encontré tu objeto "${device.name}".`;
      await prisma.foundObjectMessage.create({
        data: {
          chatId: chat.id,
          isOwner: false,
          content: initialMessage,
        },
      });

      // Create notification in database
      await prisma.notification.create({
        data: {
          type: 'FOUND_OBJECT',
          receiverId: device.userId,
          content: `${finderName || 'Alguien'} encontró tu objeto "${device.name}"`,
          chatId: chat.id,
        },
      });

      // Send push notification to owner
      if (device.user.expoPushToken) {
        await sendPushNotification(
          device.user.expoPushToken,
          '¡Alguien encontró tu objeto!',
          `${finderName || 'Alguien'} encontró: ${device.name}`,
          {
            type: 'FOUND_OBJECT',
            chatId: chat.id,
            deviceId: device.id,
          }
        );
      }

      res.status(201).json({
        chatId: chat.id,
        sessionId,
        deviceName: device.name,
      });
    } catch (error: any) {
      console.error('Error starting anonymous chat:', error);
      console.error('Error details:', error?.message, error?.code);
      res.status(500).json({ error: 'Failed to start chat', details: error?.message });
    }
  }

  // PUBLIC: Get chat messages for anonymous user
  static async getAnonymousMessages(req: Request, res: Response) {
    try {
      const { chatId, sessionId } = req.params;

      const chat = await prisma.foundObjectChat.findFirst({
        where: {
          id: chatId,
          finderSessionId: sessionId,
        },
        include: {
          device: {
            select: { name: true },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found or session invalid' });
      }

      res.json({
        chatId: chat.id,
        deviceName: chat.device.name,
        status: chat.status,
        messages: chat.messages.map((m) => ({
          id: m.id,
          isOwner: m.isOwner,
          content: m.content,
          createdAt: m.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error getting anonymous messages:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  // PUBLIC: Send message as anonymous user
  static async sendAnonymousMessage(req: Request, res: Response) {
    try {
      const { chatId, sessionId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const chat = await prisma.foundObjectChat.findFirst({
        where: {
          id: chatId,
          finderSessionId: sessionId,
          status: 'ACTIVE',
        },
        include: {
          owner: {
            select: { id: true, expoPushToken: true },
          },
          device: {
            select: { name: true },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found, session invalid, or chat closed' });
      }

      const message = await prisma.foundObjectMessage.create({
        data: {
          chatId: chat.id,
          isOwner: false,
          content: content.trim(),
        },
      });

      // Send WebSocket notification to owner for real-time update
      sendToUser(chat.owner.id, {
        type: 'new_message',
        foundChatId: chat.id,
        chatId: chat.id,
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        isOwner: false,
        finderName: chat.finderName,
      });

      // Send push notification to owner
      if (chat.owner.expoPushToken) {
        await sendPushNotification(
          chat.owner.expoPushToken,
          'Nuevo mensaje sobre tu objeto',
          `${chat.finderName || 'Alguien'}: ${content.trim().substring(0, 50)}...`,
          {
            type: 'FOUND_OBJECT_MESSAGE',
            chatId: chat.id,
          }
        );
      }

      res.status(201).json({
        id: message.id,
        isOwner: message.isOwner,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error('Error sending anonymous message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // AUTHENTICATED: Get all found object chats (as owner)
  static async getFoundChats(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { status } = req.query;

      const whereClause: any = { ownerId: userId };
      if (status && ['ACTIVE', 'RESOLVED', 'CLOSED'].includes(status as string)) {
        whereClause.status = status;
      }

      const chats = await prisma.foundObjectChat.findMany({
        where: whereClause,
        include: {
          device: {
            select: { name: true, type: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      res.json(
        chats.map((chat) => ({
          id: chat.id,
          deviceId: chat.deviceId,
          device: {
            id: chat.deviceId,
            name: chat.device.name,
            type: chat.device.type,
          },
          finderName: chat.finderName,
          status: chat.status,
          lastMessage: chat.messages[0]?.content || null,
          unreadCount: 0, // TODO: implement unread tracking
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        }))
      );
    } catch (error) {
      console.error('Error getting found chats:', error);
      res.status(500).json({ error: 'Failed to get chats' });
    }
  }

  // AUTHENTICATED: Get specific chat (as owner)
  static async getFoundChat(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { chatId } = req.params;

      const chat = await prisma.foundObjectChat.findFirst({
        where: {
          id: chatId,
          ownerId: userId,
        },
        include: {
          device: {
            select: { name: true, type: true },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.json({
        id: chat.id,
        deviceId: chat.deviceId,
        device: {
          id: chat.deviceId,
          name: chat.device.name,
          type: chat.device.type,
        },
        finderName: chat.finderName,
        status: chat.status,
        messages: chat.messages.map((m) => ({
          id: m.id,
          isOwner: m.isOwner,
          content: m.content,
          createdAt: m.createdAt,
        })),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      });
    } catch (error) {
      console.error('Error getting found chat:', error);
      res.status(500).json({ error: 'Failed to get chat' });
    }
  }

  // AUTHENTICATED: Send message as owner
  static async sendOwnerMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { chatId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const chat = await prisma.foundObjectChat.findFirst({
        where: {
          id: chatId,
          ownerId: userId,
          status: 'ACTIVE',
        },
        include: {
          finder: {
            select: { id: true, expoPushToken: true },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found or closed' });
      }

      const message = await prisma.foundObjectMessage.create({
        data: {
          chatId: chat.id,
          isOwner: true,
          content: content.trim(),
        },
      });

      // Update chat timestamp
      await prisma.foundObjectChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      // Send WebSocket notification to finder if they are a registered user
      if (chat.finderId) {
        sendToUser(chat.finderId, {
          type: 'new_message',
          foundChatId: chat.id,
          chatId: chat.id,
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          isOwner: true,
        });

        // Also send push notification to finder
        if (chat.finder?.expoPushToken) {
          await sendPushNotification(
            chat.finder.expoPushToken,
            'Respuesta del dueño',
            content.trim().substring(0, 50) + (content.length > 50 ? '...' : ''),
            {
              type: 'FOUND_OBJECT_MESSAGE',
              chatId: chat.id,
            }
          );
        }
      }

      res.status(201).json({
        id: message.id,
        isOwner: message.isOwner,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error('Error sending owner message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // AUTHENTICATED: Update chat status
  static async updateChatStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { chatId } = req.params;
      const { status } = req.body;

      if (!status || !['RESOLVED', 'CLOSED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be RESOLVED or CLOSED' });
      }

      const chat = await prisma.foundObjectChat.findFirst({
        where: {
          id: chatId,
          ownerId: userId,
        },
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const updatedChat = await prisma.foundObjectChat.update({
        where: { id: chatId },
        data: { status },
        include: {
          device: {
            select: { name: true, type: true },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      res.json({
        id: updatedChat.id,
        deviceId: updatedChat.deviceId,
        device: {
          id: updatedChat.deviceId,
          name: updatedChat.device.name,
          type: updatedChat.device.type,
        },
        finderName: updatedChat.finderName,
        status: updatedChat.status,
        messages: updatedChat.messages.map((m) => ({
          id: m.id,
          isOwner: m.isOwner,
          content: m.content,
          createdAt: m.createdAt,
        })),
        createdAt: updatedChat.createdAt,
        updatedAt: updatedChat.updatedAt,
      });
    } catch (error) {
      console.error('Error updating chat status:', error);
      res.status(500).json({ error: 'Failed to update chat status' });
    }
  }

  // AUTHENTICATED: Start chat as registered user who found object
  static async startRegisteredChat(req: AuthRequest, res: Response) {
    try {
      const finderId = req.userId!;
      const { qrCode } = req.params;
      const { message } = req.body;

      const device = await prisma.device.findUnique({
        where: { qrCode },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              expoPushToken: true,
            },
          },
        },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      if (!device.qrEnabled) {
        return res.status(403).json({ error: 'QR code is disabled for this device' });
      }

      if (!device.userId || !device.user) {
        return res.status(400).json({ error: 'Device has no owner' });
      }

      // Can't contact own device
      if (device.userId === finderId) {
        return res.status(400).json({ error: 'You cannot contact yourself about your own device' });
      }

      // Check if there's already an active chat from this finder
      const existingChat = await prisma.foundObjectChat.findFirst({
        where: {
          deviceId: device.id,
          finderId,
          status: 'ACTIVE',
        },
      });

      if (existingChat) {
        return res.status(409).json({
          error: 'You already have an active chat for this device',
          chatId: existingChat.id,
        });
      }

      // Get finder name
      const finder = await prisma.user.findUnique({
        where: { id: finderId },
        select: { name: true },
      });

      // Create chat
      const chat = await prisma.foundObjectChat.create({
        data: {
          deviceId: device.id,
          ownerId: device.userId,
          finderId,
          finderName: finder?.name || 'Usuario',
        },
      });

      // Create initial message
      const initialMessage = message || `¡Hola! Encontré tu objeto "${device.name}".`;
      await prisma.foundObjectMessage.create({
        data: {
          chatId: chat.id,
          isOwner: false,
          content: initialMessage,
        },
      });

      // Send push notification to owner
      if (device.user.expoPushToken) {
        await sendPushNotification(
          device.user.expoPushToken,
          '¡Alguien encontró tu objeto!',
          `${finder?.name || 'Alguien'} encontró: ${device.name}`,
          {
            type: 'FOUND_OBJECT',
            chatId: chat.id,
            deviceId: device.id,
          }
        );
      }

      res.status(201).json({
        chatId: chat.id,
        deviceName: device.name,
      });
    } catch (error) {
      console.error('Error starting registered chat:', error);
      res.status(500).json({ error: 'Failed to start chat' });
    }
  }

  // AUTHENTICATED: Get chats where user is the finder
  static async getFinderChats(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const chats = await prisma.foundObjectChat.findMany({
        where: { finderId: userId },
        include: {
          device: {
            select: { name: true, type: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      res.json(
        chats.map((chat) => ({
          id: chat.id,
          deviceName: chat.device.name,
          deviceType: chat.device.type,
          status: chat.status,
          lastMessage: chat.messages[0] || null,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        }))
      );
    } catch (error) {
      console.error('Error getting finder chats:', error);
      res.status(500).json({ error: 'Failed to get chats' });
    }
  }

  // AUTHENTICATED: Send message as registered finder
  static async sendFinderMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { chatId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const chat = await prisma.foundObjectChat.findFirst({
        where: {
          id: chatId,
          finderId: userId,
          status: 'ACTIVE',
        },
        include: {
          owner: {
            select: { id: true, expoPushToken: true },
          },
          device: {
            select: { name: true },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found or closed' });
      }

      const message = await prisma.foundObjectMessage.create({
        data: {
          chatId: chat.id,
          isOwner: false,
          content: content.trim(),
        },
      });

      // Send WebSocket notification to owner for real-time update
      sendToUser(chat.owner.id, {
        type: 'new_message',
        foundChatId: chat.id,
        chatId: chat.id,
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        isOwner: false,
        finderName: chat.finderName,
      });

      // Send push notification to owner
      if (chat.owner.expoPushToken) {
        await sendPushNotification(
          chat.owner.expoPushToken,
          'Nuevo mensaje sobre tu objeto',
          `${chat.finderName}: ${content.trim().substring(0, 50)}...`,
          {
            type: 'FOUND_OBJECT_MESSAGE',
            chatId: chat.id,
          }
        );
      }

      res.status(201).json({
        id: message.id,
        isOwner: message.isOwner,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error('Error sending finder message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
}
