import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export class EventController {
  static async createEvent(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { deviceId, type, description, latitude, longitude, imageUrl, isUrgent, realTimeTracking } =
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

      const event = await prisma.event.create({
        data: {
          deviceId: deviceId || null,
          userId,
          type,
          description,
          latitude,
          longitude,
          imageUrl,
          isUrgent: isUrgent || false,
          realTimeTracking: realTimeTracking || false,
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
      console.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }

  static async getEvents(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const events = await prisma.event.findMany({
        where: { userId },
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

      // First get the event to check if it exists and get its creation date
      const event = await prisma.event.findFirst({
        where: {
          id,
          isPublic: true,
          realTimeTracking: true,
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found or not tracked' });
      }

      if (!event.deviceId) {
        return res.json({
          eventId: event.id,
          deviceId: null,
          positions: [],
        });
      }

      // Get positions from the device ONLY from when the event was created onwards
      // If event is closed, get positions up to when it was closed
      // NOTE: Using createdAt instead of timestamp because timestamp may have incorrect dates
      const endTime = event.status === 'CLOSED' ? event.updatedAt : new Date();

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

      // Filter out invalid coordinates (e.g., wrong hemisphere)
      // For Argentina, longitude should be negative (West)
      const positions = allPositions.filter(pos => {
        const isValid = pos.longitude < 0; // Must be in Western Hemisphere
        if (!isValid) {
          console.warn(`Filtering out invalid position: lat=${pos.latitude}, lon=${pos.longitude} (should be negative for Argentina)`);
        }
        return isValid;
      });

      console.log(`Event ${id}: Found ${positions.length} positions for tracking`);
      console.log(`Event created at: ${event.createdAt}, Status: ${event.status}`);
      if (event.status === 'CLOSED') {
        console.log(`Event closed at: ${event.updatedAt}`);
      }
      if (positions.length > 0) {
        console.log(`First position createdAt: ${positions[0].createdAt}, Last position createdAt: ${positions[positions.length - 1].createdAt}`);
        console.log(`First position timestamp: ${positions[0].timestamp}, Last position timestamp: ${positions[positions.length - 1].timestamp}`);

        // Write coordinates to a file for easy viewing
        const fs = require('fs');
        const coordsData = positions.map((pos, index) => ({
          index: index + 1,
          latitude: pos.latitude,
          longitude: pos.longitude,
          createdAt: pos.createdAt
        }));
        fs.writeFileSync(`/tmp/event-${id}-coordinates.json`, JSON.stringify(coordsData, null, 2));
        console.log(`\nCoordinates written to /tmp/event-${id}-coordinates.json`);
        console.log('First 5 coordinates:');
        coordsData.slice(0, 5).forEach(coord => {
          console.log(`  ${coord.index}. [${coord.latitude}, ${coord.longitude}]`);
        });
        if (coordsData.length > 5) {
          console.log(`  ... and ${coordsData.length - 5} more`);
        }
        console.log();
      }

      // Return the positions
      res.json({
        eventId: event.id,
        deviceId: event.deviceId,
        positions,
      });
    } catch (error) {
      console.error('Error fetching event positions:', error);
      res.status(500).json({ error: 'Failed to fetch event positions' });
    }
  }
}
