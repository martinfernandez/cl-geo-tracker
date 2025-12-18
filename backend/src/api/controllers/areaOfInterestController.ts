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
}
