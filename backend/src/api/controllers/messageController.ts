import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { broadcastNewMessage } from '../../websocket/wsServer';
import { sendMessageNotification } from '../../services/pushNotificationService';

interface AuthRequest extends Request {
  userId?: string;
}

export class MessageController {
  // Create or get conversation (for urgent events OR direct messages between users)
  static async getOrCreateConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { eventId, otherUserId } = req.body;

      // Validate userId from auth token
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!otherUserId) {
        return res.status(400).json({ error: 'Other user ID is required' });
      }

      // Verify otherUser exists
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, name: true },
      });

      if (!otherUser) {
        return res.status(404).json({ error: 'Other user not found' });
      }

      // Allow self-conversations (like "Saved Messages" for notes)

      // If eventId is provided, verify event exists and is urgent
      if (eventId) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            isUrgent: true,
            userId: true,
            type: true,
            description: true,
          },
        });

        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        if (!event.isUrgent) {
          return res.status(400).json({ error: 'Conversations are only available for urgent events' });
        }
      }

      // Check if conversation already exists with these exact participants
      // For event-based: match eventId + participants
      // For direct: match null eventId + participants
      console.log('[MessageController] Looking for conversation:', { eventId: eventId || null, userId, otherUserId });

      const isSelfConversation = userId === otherUserId;

      let conversation;

      if (isSelfConversation) {
        // For self-conversations, find one where the user appears exactly twice (or once in a self-convo)
        // and there are no other participants
        conversation = await prisma.conversation.findFirst({
          where: {
            eventId: eventId || null,
            isGroupChat: false,
            participants: {
              every: {
                userId: userId,
              },
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            event: {
              select: {
                id: true,
                type: true,
                description: true,
                isUrgent: true,
              },
            },
          },
        });
      } else {
        // For regular 1-to-1 conversations, find one with exactly these two participants
        conversation = await prisma.conversation.findFirst({
          where: {
            eventId: eventId || null,
            isGroupChat: false,
            AND: [
              {
                participants: {
                  some: {
                    userId: userId,
                  },
                },
              },
              {
                participants: {
                  some: {
                    userId: otherUserId,
                  },
                },
              },
            ],
            // Ensure it's not a self-conversation (where all participants are the same user)
            NOT: {
              participants: {
                every: {
                  userId: userId,
                },
              },
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            event: {
              select: {
                id: true,
                type: true,
                description: true,
                isUrgent: true,
              },
            },
          },
        });
      }

      console.log('[MessageController] Existing conversation found:', !!conversation);

      // Create conversation if it doesn't exist
      if (!conversation) {
        console.log('[MessageController] Creating new conversation...', { isSelfConversation });
        try {
          // For self-conversations, only create one participant entry
          const participantsToCreate = isSelfConversation
            ? [{ userId }]
            : [{ userId }, { userId: otherUserId }];

          conversation = await prisma.conversation.create({
            data: {
              ...(eventId && { eventId }),
              isGroupChat: false,
              participants: {
                create: participantsToCreate,
              },
            },
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              event: {
                select: {
                  id: true,
                  type: true,
                  description: true,
                  isUrgent: true,
                },
              },
            },
          });
        } catch (createError: any) {
          console.log('[MessageController] Create error:', createError.code, createError.message);
          // If creation fails due to unique constraint (race condition), try to find again
          if (createError.code === 'P2002') {
            console.log('[MessageController] Race condition detected, finding existing conversation...');

            // Use the same query logic as above for the retry
            if (isSelfConversation) {
              conversation = await prisma.conversation.findFirst({
                where: {
                  eventId: eventId || null,
                  isGroupChat: false,
                  participants: {
                    every: {
                      userId: userId,
                    },
                  },
                },
                include: {
                  participants: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                  event: {
                    select: {
                      id: true,
                      type: true,
                      description: true,
                      isUrgent: true,
                    },
                  },
                },
              });
            } else {
              conversation = await prisma.conversation.findFirst({
                where: {
                  eventId: eventId || null,
                  isGroupChat: false,
                  AND: [
                    {
                      participants: {
                        some: {
                          userId: userId,
                        },
                      },
                    },
                    {
                      participants: {
                        some: {
                          userId: otherUserId,
                        },
                      },
                    },
                  ],
                  NOT: {
                    participants: {
                      every: {
                        userId: userId,
                      },
                    },
                  },
                },
                include: {
                  participants: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                  event: {
                    select: {
                      id: true,
                      type: true,
                      description: true,
                      isUrgent: true,
                    },
                  },
                },
              });
            }

            if (!conversation) {
              throw createError; // Re-throw if still not found
            }
          } else {
            throw createError; // Re-throw other errors
          }
        }
      }

      res.json(conversation);
    } catch (error: any) {
      console.error('Error creating/getting conversation:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
        userId: req.userId,
        otherUserId: req.body.otherUserId,
        eventId: req.body.eventId,
      });
      res.status(500).json({ error: 'Failed to create/get conversation' });
    }
  }

  // Get all user's conversations (inbox)
  static async getUserConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const participants = await prisma.conversationParticipant.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              event: {
                select: {
                  id: true,
                  type: true,
                  description: true,
                  isUrgent: true,
                },
              },
              group: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
              participants: {
                where: {
                  userId: { not: userId },
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      imageUrl: true,
                    },
                  },
                },
              },
              messages: {
                orderBy: {
                  createdAt: 'desc',
                },
                take: 1,
                include: {
                  sender: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          conversation: {
            lastMessageAt: 'desc',
          },
        },
      });

      // Format response
      const conversations = participants.map((p) => ({
        id: p.conversation.id,
        eventId: p.conversation.eventId,
        event: p.conversation.event,
        isGroupChat: p.conversation.isGroupChat,
        groupId: p.conversation.groupId,
        group: p.conversation.group,
        otherUser: p.conversation.isGroupChat ? null : p.conversation.participants[0]?.user,
        participants: p.conversation.isGroupChat ? p.conversation.participants.map(part => part.user) : undefined,
        lastMessage: p.conversation.messages[0],
        unreadCount: p.unreadCount,
        lastMessageAt: p.conversation.lastMessageAt,
      }));

      res.json(conversations);
    } catch (error) {
      console.error('Error getting user conversations:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  }

  // Get conversation by ID with messages
  static async getConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          event: {
            select: {
              id: true,
              type: true,
              description: true,
              isUrgent: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Verify user is a participant
      const isParticipant = conversation.participants.some((p) => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error getting conversation:', error);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  }

  // Send message
  static async sendMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id: conversationId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Verify conversation exists and user is a participant
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  expoPushToken: true,
                },
              },
            },
          },
          event: {
            select: {
              id: true,
              type: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const userParticipant = conversation.participants.find((p) => p.userId === userId);
      if (!userParticipant) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // For group chats, receiverId is null
      // For 1-to-1 chats, get the receiver
      const isGroupChat = conversation.isGroupChat;
      let receiverId: string | null = null;

      if (!isGroupChat) {
        // For self-conversations, both participants are the same user
        // For regular 1-to-1, find the other participant
        const receiverParticipant = conversation.participants.find((p) => p.userId !== userId);
        // If no other participant found, it's a self-conversation - use own userId
        receiverId = receiverParticipant?.userId || userId;
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          receiverId,  // null for group chats
          content: content.trim(),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Update conversation lastMessageAt
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
        },
      });

      // Increment unread count for all other participants
      const otherParticipants = conversation.participants.filter((p) => p.userId !== userId);

      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: { in: otherParticipants.map((p) => p.userId) },
        },
        data: {
          unreadCount: {
            increment: 1,
          },
        },
      });

      // Broadcast message via WebSocket to conversation participants
      broadcastNewMessage(conversationId, message);

      // Send push notifications to all other participants with tokens
      const notificationPromises = otherParticipants
        .filter((p) => p.user.expoPushToken)
        .map((p) => {
          const notificationData: any = {
            conversationId,
            senderId: userId,
            senderName: message.sender.name,
          };

          // Add context based on conversation type
          if (isGroupChat && conversation.group) {
            notificationData.groupId = conversation.group.id;
            notificationData.groupName = conversation.group.name;
            notificationData.isGroupChat = true;
          } else if (conversation.event) {
            notificationData.eventId = conversation.event.id;
          }

          return sendMessageNotification(
            p.user.expoPushToken!,
            isGroupChat && conversation.group
              ? `${message.sender.name}: ${content.trim()}`
              : content.trim(),
            notificationData
          ).catch((error) => {
            console.error(`Failed to send push notification to user ${p.userId}:`, error);
          });
        });

      // Fire and forget - don't wait for all notifications
      Promise.all(notificationPromises).catch(() => {});

      res.json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id: conversationId } = req.params;

      // Verify user is a participant and get conversation info
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        include: {
          conversation: {
            select: {
              isGroupChat: true,
            },
          },
        },
      });

      if (!participant) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // For group chats: mark all messages NOT from user as read
      // For 1-to-1: mark messages where receiverId is user
      if (participant.conversation.isGroupChat) {
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });
      } else {
        await prisma.message.updateMany({
          where: {
            conversationId,
            receiverId: userId,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });
      }

      // Reset unread count for this user
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: {
          unreadCount: 0,
          lastReadAt: new Date(),
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  }

  // Get conversations for an event (for event owner)
  static async getEventConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { eventId } = req.params;

      // Verify event exists and user is the owner
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { userId: true },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get all conversations for this event
      const conversations = await prisma.conversation.findMany({
        where: { eventId },
        include: {
          participants: {
            where: { userId: { not: userId } },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      // Get unread counts for current user
      const participantData = await prisma.conversationParticipant.findMany({
        where: {
          userId,
          conversationId: { in: conversations.map(c => c.id) },
        },
        select: {
          conversationId: true,
          unreadCount: true,
        },
      });

      const unreadMap = new Map(participantData.map(p => [p.conversationId, p.unreadCount]));

      const result = conversations.map(c => ({
        id: c.id,
        eventId: c.eventId,
        otherUser: c.participants[0]?.user,
        lastMessage: c.messages[0],
        unreadCount: unreadMap.get(c.id) || 0,
        lastMessageAt: c.lastMessageAt,
      }));

      res.json(result);
    } catch (error) {
      console.error('Error getting event conversations:', error);
      res.status(500).json({ error: 'Failed to get event conversations' });
    }
  }

  // Get unread message count
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const result = await prisma.conversationParticipant.aggregate({
        where: { userId },
        _sum: {
          unreadCount: true,
        },
      });

      const totalUnread = result._sum.unreadCount || 0;

      res.json({ count: totalUnread });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  }
}
