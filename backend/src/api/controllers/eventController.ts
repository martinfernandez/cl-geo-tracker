import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { notifyUsersAboutNewEvent } from '../../services/areaEventNotificationService';
import { updateDeviceIntervalBasedOnEvents } from '../../services/deviceCommandService';

export class EventController {
  static async createEvent(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { deviceId, phoneDeviceId, type, description, latitude, longitude, imageUrl, isUrgent, realTimeTracking, groupId, isPublic } =
        req.body;

      if (!type || !description || !latitude || !longitude) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // If deviceId is provided, validate and assign ownership if needed
      if (deviceId) {
        let device = await prisma.device.findUnique({
          where: { id: deviceId },
        });

        if (!device) {
          return res.status(404).json({ error: 'Device not found' });
        }

        // If device has no owner, assign it to current user
        if (!device.userId) {
          device = await prisma.device.update({
            where: { id: deviceId },
            data: { userId },
          });
        } else if (device.userId !== userId) {
          // Device belongs to another user
          return res.status(403).json({ error: 'Device belongs to another user' });
        }
      }

      // If phoneDeviceId is provided, validate it belongs to the user
      if (phoneDeviceId) {
        const phoneDevice = await prisma.phoneDevice.findUnique({
          where: { id: phoneDeviceId },
        });

        if (!phoneDevice) {
          return res.status(404).json({ error: 'Phone device not found' });
        }

        if (phoneDevice.userId !== userId) {
          return res.status(403).json({ error: 'Phone device belongs to another user' });
        }
      }

      // If groupId is provided, validate user is ADMIN of the group
      if (groupId) {
        const membership = await prisma.groupMembership.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId,
            },
          },
        });

        if (!membership) {
          return res.status(403).json({ error: 'No eres miembro de este grupo' });
        }

        // Solo ADMIN puede crear eventos de grupo
        if (membership.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Solo los administradores pueden crear eventos de grupo' });
        }
      }

      // Para eventos de grupo: isPublic es false por defecto
      // Para eventos sin grupo: isPublic es true por defecto
      const eventIsPublic = groupId
        ? (isPublic ?? false)  // Con grupo: privado por defecto
        : (isPublic ?? true);  // Sin grupo: público por defecto

      // Extract media array from request body
      const { media } = req.body;

      const event = await prisma.event.create({
        data: {
          deviceId: deviceId || null,
          phoneDeviceId: phoneDeviceId || null,
          userId,
          groupId: groupId || null,
          type,
          description,
          latitude,
          longitude,
          imageUrl, // Keep for backward compatibility
          isUrgent: isUrgent || false,
          realTimeTracking: realTimeTracking || false,
          isPublic: eventIsPublic,
          // Create media records if provided
          ...(media && media.length > 0 && {
            media: {
              createMany: {
                data: media.map((m: any, index: number) => ({
                  type: m.type,
                  url: m.url,
                  thumbnailUrl: m.thumbnailUrl || null,
                  duration: m.duration || null,
                  order: m.order !== undefined ? m.order : index,
                })),
              },
            },
          }),
        },
        include: {
          device: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          media: {
            orderBy: { order: 'asc' },
          },
        },
      });

      // Notify users who have areas of interest containing this event
      notifyUsersAboutNewEvent(event).catch((err) => {
        console.error('Error notifying about new event:', err);
      });

      // Update GPS device interval if event has a GPS tracker attached
      if (deviceId) {
        updateDeviceIntervalBasedOnEvents(deviceId).catch((err) => {
          console.error('Error updating device interval:', err);
        });
      }

      res.json(event);
    } catch (error: any) {
      console.error('Error creating event:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to create event', details: error.message });
    }
  }

  static async getEvents(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      // Get groups where user is a member
      const userGroups = await prisma.groupMembership.findMany({
        where: { userId },
        select: { groupId: true },
      });
      const groupIds = userGroups.map((g) => g.groupId);

      const events = await prisma.event.findMany({
        where: {
          OR: [
            // User's own events
            { userId },
            // Events from groups user belongs to
            { groupId: { in: groupIds } },
          ],
        },
        include: {
          device: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          media: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  static async getEvent(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const event = await prisma.event.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          device: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          media: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      res.json(event);
    } catch (error) {
      console.error('Error fetching event:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }

  static async updateEvent(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { status, description, imageUrl, isUrgent } = req.body;

      const existingEvent = await prisma.event.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const event = await prisma.event.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(description && { description }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(isUrgent !== undefined && { isUrgent }),
        },
        include: {
          device: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          media: {
            orderBy: { order: 'asc' },
          },
        },
      });

      // Update GPS device interval when event status changes (especially when closed)
      if (status && existingEvent.deviceId) {
        updateDeviceIntervalBasedOnEvents(existingEvent.deviceId).catch((err) => {
          console.error('Error updating device interval:', err);
        });
      }

      res.json(event);
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }

  static async deleteEvent(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const event = await prisma.event.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Save deviceId before deletion for interval recalculation
      const deviceIdForInterval = event.deviceId;

      await prisma.event.delete({
        where: { id },
      });

      // Update GPS device interval after event deletion
      if (deviceIdForInterval) {
        updateDeviceIntervalBasedOnEvents(deviceIdForInterval).catch((err) => {
          console.error('Error updating device interval:', err);
        });
      }

      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }

  static async getPublicEventsByRegion(req: AuthRequest, res: Response) {
    try {
      const { northEast, southWest, status, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const userId = req.user?.id;

      if (!northEast || !southWest) {
        return res.status(400).json({ error: 'Missing region bounds' });
      }

      const [neLat, neLng] = (northEast as string).split(',').map(Number);
      const [swLat, swLng] = (southWest as string).split(',').map(Number);

      // Build the base location filter
      const locationFilter = {
        latitude: {
          gte: Math.min(swLat, neLat),
          lte: Math.max(swLat, neLat),
        },
        longitude: {
          gte: Math.min(swLng, neLng),
          lte: Math.max(swLng, neLng),
        },
      };

      // Build the where clause to include:
      // 1. All public events in the region
      // 2. All events (public or private) owned by the authenticated user in the region
      const where: any = {
        AND: [
          locationFilter,
          {
            OR: [
              { isPublic: true },
              ...(userId ? [{ userId }] : []),
            ],
          },
        ],
      };

      if (status) {
        where.AND.push({ status });
      }

      if (type) {
        where.AND.push({ type });
      }

      // Order by urgent first, then by the specified sortBy field
      const orderBy: any = [
        { isUrgent: 'desc' }, // Urgent events first
        { [sortBy as string]: sortOrder },
      ];

      const events = await prisma.event.findMany({
        where,
        include: {
          device: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          media: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              reactions: true,
              comments: true,
            },
          },
        },
        orderBy,
      });

      // Add user's reaction status if authenticated
      const eventsWithReactionStatus = await Promise.all(
        events.map(async (event) => {
          let userReacted = false;
          if (userId) {
            const reaction = await prisma.reaction.findUnique({
              where: {
                eventId_userId: {
                  eventId: event.id,
                  userId,
                },
              },
            });
            userReacted = !!reaction;
          }
          return {
            ...event,
            reactionCount: event._count.reactions,
            commentCount: event._count.comments,
            userReacted,
          };
        })
      );

      res.json(eventsWithReactionStatus);
    } catch (error) {
      console.error('Error fetching public events by region:', error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(500).json({ error: 'Failed to fetch public events' });
    }
  }

  static async getPublicEventById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const event = await prisma.event.findFirst({
        where: {
          id,
          isPublic: true,
        },
        include: {
          device: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          media: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              reactions: true,
              comments: true,
            },
          },
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if current user has reacted
      let userReacted = false;
      if (userId) {
        const reaction = await prisma.reaction.findUnique({
          where: {
            eventId_userId: {
              eventId: id,
              userId,
            },
          },
        });
        userReacted = !!reaction;
      }

      const eventWithReactionStatus = {
        ...event,
        reactionCount: event._count.reactions,
        commentCount: event._count.comments,
        userReacted,
      };

      res.json(eventWithReactionStatus);
    } catch (error) {
      console.error('Error fetching public event by ID:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }

  static async getEventPositions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      // First get the event to check if it exists and get its creation date
      const event = await prisma.event.findFirst({
        where: {
          id,
          realTimeTracking: true,
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found or not tracked' });
      }

      // Check access permissions
      let hasAccess = event.isPublic; // Public events are accessible to all

      // Event owner always has access
      if (userId && event.userId === userId) {
        hasAccess = true;
      }

      // Group members have access to group events
      if (!hasAccess && userId && event.groupId) {
        const membership = await prisma.groupMembership.findUnique({
          where: {
            groupId_userId: {
              groupId: event.groupId,
              userId,
            },
          },
        });
        if (membership) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(404).json({ error: 'Event not found or not tracked' });
      }

      // Check if event has no tracking device at all
      if (!event.deviceId && !event.phoneDeviceId) {
        return res.json({
          eventId: event.id,
          deviceId: null,
          phoneDeviceId: null,
          positions: [],
        });
      }

      // Get positions from the device ONLY from when the event was created onwards
      // If event is closed, get positions up to when it was closed
      const endTime = event.status === 'CLOSED' ? event.updatedAt : new Date();

      let positions: any[] = [];

      // Fetch from GPS Device if deviceId is set
      if (event.deviceId) {
        const allPositions = await prisma.position.findMany({
          where: {
            deviceId: event.deviceId,
            createdAt: {
              gte: event.createdAt,
              lte: endTime,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        // Filter out invalid coordinates (e.g., wrong hemisphere for Argentina)
        positions = allPositions.filter(pos => {
          const isValid = pos.longitude < 0;
          if (!isValid) {
            console.warn(`Filtering out invalid position: lat=${pos.latitude}, lon=${pos.longitude}`);
          }
          return isValid;
        });
      }
      // Fetch from Phone Device if phoneDeviceId is set
      else if (event.phoneDeviceId) {
        const phonePositions = await prisma.phonePosition.findMany({
          where: {
            phoneDeviceId: event.phoneDeviceId,
            createdAt: {
              gte: event.createdAt,
              lte: endTime,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        // Filter out invalid coordinates
        positions = phonePositions.filter(pos => {
          const isValid = pos.longitude < 0;
          if (!isValid) {
            console.warn(`Filtering out invalid phone position: lat=${pos.latitude}, lon=${pos.longitude}`);
          }
          return isValid;
        });
      }

      console.log(`Event ${id}: Found ${positions.length} positions for tracking (${event.deviceId ? 'GPS Device' : 'Phone Device'})`);

      // Return the positions
      res.json({
        eventId: event.id,
        deviceId: event.deviceId || null,
        phoneDeviceId: event.phoneDeviceId || null,
        positions,
      });
    } catch (error) {
      console.error('Error fetching event positions:', error);
      res.status(500).json({ error: 'Failed to fetch event positions' });
    }
  }

  /**
   * Add media to an existing event
   */
  static async addEventMedia(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { media } = req.body; // Array of {type, url, thumbnailUrl?, duration?, order}

      // Verify event exists and belongs to user
      const event = await prisma.event.findFirst({
        where: { id, userId },
        include: { media: true },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check max media limit (5)
      const currentCount = event.media.length;
      const newCount = Array.isArray(media) ? media.length : 1;

      if (currentCount + newCount > 5) {
        return res.status(400).json({
          error: `Maximum 5 media items allowed. Current: ${currentCount}, Adding: ${newCount}`,
        });
      }

      // Get the highest current order
      const maxOrder = event.media.length > 0
        ? Math.max(...event.media.map((m) => m.order))
        : -1;

      // Create the new media records
      const mediaItems = Array.isArray(media) ? media : [media];
      const createdMedia = await prisma.eventMedia.createMany({
        data: mediaItems.map((m: any, index: number) => ({
          eventId: id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl || null,
          duration: m.duration || null,
          order: m.order !== undefined ? m.order : maxOrder + 1 + index,
        })),
      });

      // Return updated event with all media
      const updatedEvent = await prisma.event.findUnique({
        where: { id },
        include: {
          media: { orderBy: { order: 'asc' } },
        },
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error('Error adding event media:', error);
      res.status(500).json({ error: 'Failed to add media to event' });
    }
  }

  /**
   * Remove a single media item from an event
   */
  static async removeEventMedia(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id, mediaId } = req.params;

      // Verify event exists and belongs to user
      const event = await prisma.event.findFirst({
        where: { id, userId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Verify media belongs to event
      const mediaItem = await prisma.eventMedia.findFirst({
        where: { id: mediaId, eventId: id },
      });

      if (!mediaItem) {
        return res.status(404).json({ error: 'Media not found' });
      }

      // Delete the media item
      await prisma.eventMedia.delete({
        where: { id: mediaId },
      });

      // Reorder remaining media to be sequential
      const remainingMedia = await prisma.eventMedia.findMany({
        where: { eventId: id },
        orderBy: { order: 'asc' },
      });

      for (let i = 0; i < remainingMedia.length; i++) {
        if (remainingMedia[i].order !== i) {
          await prisma.eventMedia.update({
            where: { id: remainingMedia[i].id },
            data: { order: i },
          });
        }
      }

      // Return updated event
      const updatedEvent = await prisma.event.findUnique({
        where: { id },
        include: {
          media: { orderBy: { order: 'asc' } },
        },
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error('Error removing event media:', error);
      res.status(500).json({ error: 'Failed to remove media from event' });
    }
  }

  /**
   * Reorder media items for an event
   */
  static async reorderEventMedia(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { mediaIds } = req.body; // Array of media IDs in desired order

      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return res.status(400).json({ error: 'mediaIds array is required' });
      }

      // Verify event exists and belongs to user
      const event = await prisma.event.findFirst({
        where: { id, userId },
        include: { media: true },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Verify all mediaIds belong to this event
      const eventMediaIds = event.media.map((m) => m.id);
      const validIds = mediaIds.every((mid: string) => eventMediaIds.includes(mid));

      if (!validIds || mediaIds.length !== event.media.length) {
        return res.status(400).json({
          error: 'Invalid mediaIds - must include all media IDs for this event',
        });
      }

      // Update order for each media item
      for (let i = 0; i < mediaIds.length; i++) {
        await prisma.eventMedia.update({
          where: { id: mediaIds[i] },
          data: { order: i },
        });
      }

      // Return updated event
      const updatedEvent = await prisma.event.findUnique({
        where: { id },
        include: {
          media: { orderBy: { order: 'asc' } },
        },
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error('Error reordering event media:', error);
      res.status(500).json({ error: 'Failed to reorder media' });
    }
  }

  /**
   * Get conversations for an event (for event owner)
   */
  static async getEventConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Verify event exists and belongs to user
      const event = await prisma.event.findFirst({
        where: { id, userId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Get all conversations for this event
      const conversations = await prisma.conversation.findMany({
        where: { eventId: id },
        include: {
          participants: {
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
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      // Format response with other user info and unread count
      const formattedConversations = conversations.map((conv) => {
        const otherParticipant = conv.participants.find((p) => p.userId !== userId);
        const userParticipant = conv.participants.find((p) => p.userId === userId);

        return {
          id: conv.id,
          eventId: conv.eventId,
          otherUser: otherParticipant?.user || null,
          lastMessage: conv.messages[0] || null,
          unreadCount: userParticipant?.unreadCount || 0,
          lastMessageAt: conv.lastMessageAt,
        };
      });

      res.json(formattedConversations);
    } catch (error) {
      console.error('Error fetching event conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }
}
