import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { notifyUsersAboutNewEvent } from '../../services/areaEventNotificationService';

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
          imageUrl,
          isUrgent: isUrgent || false,
          realTimeTracking: realTimeTracking || false,
          isPublic: eventIsPublic,
        },
        include: {
          device: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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

      // Notify users who have areas of interest containing this event
      notifyUsersAboutNewEvent(event).catch((err) => {
        console.error('Error notifying about new event:', err);
      });

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
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
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
            },
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
            },
          },
        },
      });

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

      await prisma.event.delete({
        where: { id },
      });

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
            },
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
            },
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
}
