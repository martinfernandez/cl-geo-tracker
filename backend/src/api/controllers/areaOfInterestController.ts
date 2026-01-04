import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export class AreaOfInterestController {
  // Create a new area of interest
  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name, description, latitude, longitude, radius, visibility } = req.body;

      if (!name || !latitude || !longitude || !radius) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (radius > 50000) {
        return res.status(400).json({ error: 'Radius cannot exceed 50km' });
      }

      const area = await prisma.areaOfInterest.create({
        data: {
          name,
          description,
          latitude,
          longitude,
          radius,
          visibility: visibility || 'PUBLIC',
          creatorId: userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      // Automatically add creator as admin member
      await prisma.areaMembership.create({
        data: {
          areaId: area.id,
          userId,
          role: 'ADMIN',
        },
      });

      res.json(area);
    } catch (error) {
      console.error('Error creating area of interest:', error);
      res.status(500).json({ error: 'Failed to create area of interest' });
    }
  }

  // Get all areas where user is a member
  static async getMyAreas(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const memberships = await prisma.areaMembership.findMany({
        where: { userId },
        include: {
          area: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get pending request counts for admin areas
      const areaIds = memberships.map((m) => m.area.id);
      const pendingRequests = await prisma.areaInvitation.groupBy({
        by: ['areaId'],
        where: {
          areaId: { in: areaIds },
          type: 'JOIN_REQUEST',
          status: 'PENDING',
        },
        _count: {
          id: true,
        },
      });

      const pendingRequestsMap = new Map(
        pendingRequests.map((pr) => [pr.areaId, pr._count.id])
      );

      const areas = memberships.map((m) => ({
        ...m.area,
        memberCount: m.area._count.members,
        userRole: m.role,
        notificationsEnabled: m.notificationsEnabled,
        newEventsCount: m.newEventsCount,
        pendingRequestsCount: m.role === 'ADMIN' ? (pendingRequestsMap.get(m.area.id) || 0) : 0,
      }));

      res.json(areas);
    } catch (error) {
      console.error('Error fetching user areas:', error);
      res.status(500).json({ error: 'Failed to fetch areas' });
    }
  }

  // Get area by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const area = await prisma.areaOfInterest.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
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
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!area) {
        return res.status(404).json({ error: 'Area not found' });
      }

      // Check if user is a member
      const membership = area.members.find((m) => m.userId === userId);

      // If area is private and user is not a member, return limited info
      if (area.visibility === 'PRIVATE' && !membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({
        ...area,
        memberCount: area._count.members,
        userRole: membership?.role || null,
        isMember: !!membership,
      });
    } catch (error) {
      console.error('Error fetching area:', error);
      res.status(500).json({ error: 'Failed to fetch area' });
    }
  }

  // Search for areas
  static async search(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { query, visibility } = req.query;

      const where: any = {
        AND: [
          // Only searchable areas (PUBLIC or PRIVATE_SHAREABLE)
          {
            visibility: {
              in: ['PUBLIC', 'PRIVATE_SHAREABLE'],
            },
          },
        ],
      };

      if (query) {
        where.AND.push({
          name: {
            contains: query as string,
            mode: 'insensitive',
          },
        });
      }

      if (visibility) {
        where.AND.push({
          visibility,
        });
      }

      const areas = await prisma.areaOfInterest.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
          members: {
            where: { userId },
            select: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      // Check if user has pending join requests for these areas
      const areaIds = areas.map((a) => a.id);
      const pendingRequests = await prisma.areaInvitation.findMany({
        where: {
          areaId: { in: areaIds },
          senderId: userId,
          type: 'JOIN_REQUEST',
          status: 'PENDING',
        },
        select: {
          areaId: true,
        },
      });

      const pendingRequestAreaIds = new Set(pendingRequests.map((pr) => pr.areaId));

      const results = areas.map((area) => ({
        ...area,
        memberCount: area._count.members,
        userRole: area.members[0]?.role || null,
        isMember: area.members.length > 0,
        hasPendingRequest: pendingRequestAreaIds.has(area.id),
      }));

      res.json(results);
    } catch (error) {
      console.error('Error searching areas:', error);
      res.status(500).json({ error: 'Failed to search areas' });
    }
  }

  // Update area
  static async update(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { name, description, latitude, longitude, radius, visibility } = req.body;

      // Check if user is admin of the area
      const membership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only area admins can update the area' });
      }

      const area = await prisma.areaOfInterest.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(latitude && { latitude }),
          ...(longitude && { longitude }),
          ...(radius && { radius }),
          ...(visibility && { visibility }),
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      res.json(area);
    } catch (error) {
      console.error('Error updating area:', error);
      res.status(500).json({ error: 'Failed to update area' });
    }
  }

  // Delete area
  static async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if user is the creator
      const area = await prisma.areaOfInterest.findUnique({
        where: { id },
      });

      if (!area) {
        return res.status(404).json({ error: 'Area not found' });
      }

      if (area.creatorId !== userId) {
        return res.status(403).json({ error: 'Only the creator can delete the area' });
      }

      await prisma.areaOfInterest.delete({
        where: { id },
      });

      res.json({ message: 'Area deleted successfully' });
    } catch (error) {
      console.error('Error deleting area:', error);
      res.status(500).json({ error: 'Failed to delete area' });
    }
  }

  // Join a public area
  static async join(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const area = await prisma.areaOfInterest.findUnique({
        where: { id },
      });

      if (!area) {
        return res.status(404).json({ error: 'Area not found' });
      }

      if (area.visibility !== 'PUBLIC') {
        return res.status(403).json({ error: 'This area requires an invitation or approval' });
      }

      // Check if already a member
      const existing = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'Already a member of this area' });
      }

      const membership = await prisma.areaMembership.create({
        data: {
          areaId: id,
          userId,
          role: 'MEMBER',
        },
        include: {
          area: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json(membership);
    } catch (error) {
      console.error('Error joining area:', error);
      res.status(500).json({ error: 'Failed to join area' });
    }
  }

  // Leave an area
  static async leave(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const area = await prisma.areaOfInterest.findUnique({
        where: { id },
      });

      if (!area) {
        return res.status(404).json({ error: 'Area not found' });
      }

      if (area.creatorId === userId) {
        return res.status(403).json({ error: 'Creator cannot leave their own area. Delete it instead.' });
      }

      const membership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(404).json({ error: 'Not a member of this area' });
      }

      await prisma.areaMembership.delete({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
      });

      res.json({ message: 'Left area successfully' });
    } catch (error) {
      console.error('Error leaving area:', error);
      res.status(500).json({ error: 'Failed to leave area' });
    }
  }

  // Remove a member (admin only)
  static async removeMember(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id, memberId } = req.params;

      // Check if user is admin
      const adminMembership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can remove members' });
      }

      // Cannot remove the creator
      const area = await prisma.areaOfInterest.findUnique({
        where: { id },
      });

      if (area?.creatorId === memberId) {
        return res.status(403).json({ error: 'Cannot remove the creator' });
      }

      await prisma.areaMembership.delete({
        where: {
          areaId_userId: {
            areaId: id,
            userId: memberId,
          },
        },
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  // Update member role (admin only)
  static async updateMemberRole(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id, memberId } = req.params;
      const { role } = req.body;

      if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Check if user is admin
      const adminMembership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can update member roles' });
      }

      // Cannot change creator's role
      const area = await prisma.areaOfInterest.findUnique({
        where: { id },
      });

      if (area?.creatorId === memberId) {
        return res.status(403).json({ error: 'Cannot change creator role' });
      }

      const membership = await prisma.areaMembership.update({
        where: {
          areaId_userId: {
            areaId: id,
            userId: memberId,
          },
        },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json(membership);
    } catch (error) {
      console.error('Error updating member role:', error);
      res.status(500).json({ error: 'Failed to update member role' });
    }
  }

  // Toggle notifications for an area
  static async toggleNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { enabled } = req.body;

      const membership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(404).json({ error: 'Not a member of this area' });
      }

      const updated = await prisma.areaMembership.update({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
        data: {
          notificationsEnabled: enabled !== undefined ? enabled : !membership.notificationsEnabled,
        },
      });

      res.json({ notificationsEnabled: updated.notificationsEnabled });
    } catch (error) {
      console.error('Error toggling notifications:', error);
      res.status(500).json({ error: 'Failed to toggle notifications' });
    }
  }

  // Reset new events count (mark as seen)
  static async markAreaAsSeen(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const membership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(404).json({ error: 'Not a member of this area' });
      }

      await prisma.areaMembership.update({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
        data: {
          newEventsCount: 0,
          lastSeenAt: new Date(),
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking area as seen:', error);
      res.status(500).json({ error: 'Failed to mark area as seen' });
    }
  }

  // Get membership info (including notification settings)
  static async getMembership(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const membership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: id,
            userId,
          },
        },
        include: {
          area: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!membership) {
        return res.status(404).json({ error: 'Not a member of this area' });
      }

      res.json(membership);
    } catch (error) {
      console.error('Error getting membership:', error);
      res.status(500).json({ error: 'Failed to get membership' });
    }
  }

  // Get nearby areas (suggestions based on user location)
  static async getNearbyAreas(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { latitude, longitude, radiusKm = 50 } = req.query;

      console.log('[NearbyAreas] Request received:', { latitude, longitude, radiusKm, userId });

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const searchRadiusKm = parseFloat(radiusKm as string);

      console.log('[NearbyAreas] Parsed coordinates:', { lat, lng, searchRadiusKm });

      // Get all public and private_shareable areas
      const areas = await prisma.areaOfInterest.findMany({
        where: {
          visibility: {
            in: ['PUBLIC', 'PRIVATE_SHAREABLE'],
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
          members: {
            where: { userId },
            select: {
              role: true,
            },
          },
        },
      });

      // Calculate distance using Haversine formula and filter by distance
      const R = 6371; // Earth's radius in km
      const nearbyAreas = areas
        .map((area) => {
          const dLat = ((area.latitude - lat) * Math.PI) / 180;
          const dLng = ((area.longitude - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((area.latitude * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c; // Distance in km

          return {
            ...area,
            distance,
          };
        })
        .filter((area) => area.distance <= searchRadiusKm)
        .sort((a, b) => a.distance - b.distance);

      // Check for pending join requests
      const areaIds = nearbyAreas.map((a) => a.id);
      const pendingRequests = await prisma.areaInvitation.findMany({
        where: {
          areaId: { in: areaIds },
          senderId: userId,
          type: 'JOIN_REQUEST',
          status: 'PENDING',
        },
        select: {
          areaId: true,
        },
      });

      const pendingRequestAreaIds = new Set(pendingRequests.map((pr) => pr.areaId));

      const results = nearbyAreas.map((area) => ({
        id: area.id,
        name: area.name,
        description: area.description,
        latitude: area.latitude,
        longitude: area.longitude,
        radius: area.radius,
        visibility: area.visibility,
        creator: area.creator,
        memberCount: area._count.members,
        distance: Math.round(area.distance * 10) / 10, // Round to 1 decimal
        userRole: area.members[0]?.role || null,
        isMember: area.members.length > 0,
        hasPendingRequest: pendingRequestAreaIds.has(area.id),
      }));

      // Return top 20 nearest areas (that user is not already a member of first, then members)
      const notMemberAreas = results.filter((a) => !a.isMember);
      const memberAreas = results.filter((a) => a.isMember);

      const finalResults = [...notMemberAreas, ...memberAreas].slice(0, 20);
      console.log('[NearbyAreas] Returning', finalResults.length, 'areas:', finalResults.map(a => ({ name: a.name, distance: a.distance })));

      res.json(finalResults);
    } catch (error) {
      console.error('Error fetching nearby areas:', error);
      res.status(500).json({ error: 'Failed to fetch nearby areas' });
    }
  }
}
