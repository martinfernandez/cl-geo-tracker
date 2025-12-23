import { prisma } from '../config/database';
import { sendToUser } from '../websocket/wsServer';

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

interface EventData {
  id: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  isUrgent: boolean;
  userId: string;
  user?: {
    name: string;
  };
}

export async function notifyUsersAboutNewEvent(event: EventData) {
  try {
    // Get all areas that might contain this event
    const areas = await prisma.areaOfInterest.findMany({
      include: {
        members: {
          where: {
            notificationsEnabled: true,
            userId: { not: event.userId }, // Don't notify the event creator
          },
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
      },
    });

    const usersToNotify: Map<string, { areas: string[]; areaIds: string[] }> = new Map();

    // Check which areas contain the event
    for (const area of areas) {
      const distance = calculateDistance(
        event.latitude,
        event.longitude,
        area.latitude,
        area.longitude
      );

      // Event is within the area
      if (distance <= area.radius) {
        // Update newEventsCount for each member
        await prisma.areaMembership.updateMany({
          where: {
            areaId: area.id,
            userId: { not: event.userId },
            notificationsEnabled: true,
          },
          data: {
            newEventsCount: { increment: 1 },
          },
        });

        // Collect users to notify
        for (const member of area.members) {
          if (!usersToNotify.has(member.userId)) {
            usersToNotify.set(member.userId, { areas: [], areaIds: [] });
          }
          const userData = usersToNotify.get(member.userId)!;
          userData.areas.push(area.name);
          userData.areaIds.push(area.id);
        }
      }
    }

    // Send WebSocket notifications to users
    for (const [userId, data] of usersToNotify) {
      const areaNames = data.areas.join(', ');
      const eventTypeLabels: Record<string, string> = {
        THEFT: 'Robo',
        LOST: 'Perdido',
        ACCIDENT: 'Accidente',
        FIRE: 'Incendio',
      };

      sendToUser(userId, {
        type: 'area_event',
        event: {
          id: event.id,
          type: event.type,
          typeLabel: eventTypeLabels[event.type] || event.type,
          description: event.description,
          isUrgent: event.isUrgent,
          latitude: event.latitude,
          longitude: event.longitude,
        },
        areaNames,
        areaIds: data.areaIds,
        message: `Nuevo evento en ${areaNames}`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[AreaEvent] Notified ${usersToNotify.size} users about event ${event.id}`);
  } catch (error) {
    console.error('Error notifying users about new event:', error);
  }
}
