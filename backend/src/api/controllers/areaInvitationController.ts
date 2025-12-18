import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export class AreaInvitationController {
  // Send an invitation to join an area
  static async sendInvitation(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { areaId, receiverId } = req.body;

      if (!areaId || !receiverId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if sender is admin
      const adminMembership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId,
            userId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can send invitations' });
      }

      // Check if receiver is already a member
      const existingMembership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId,
            userId: receiverId,
          },
        },
      });

      if (existingMembership) {
        return res.status(409).json({ error: 'User is already a member' });
      }

      // Check if invitation already exists
      const existingInvitation = await prisma.areaInvitation.findFirst({
        where: {
          areaId,
          receiverId,
          status: 'PENDING',
        },
      });

      if (existingInvitation) {
        return res.status(409).json({ error: 'Invitation already sent' });
      }

      const invitation = await prisma.areaInvitation.create({
        data: {
          areaId,
          senderId: userId,
          receiverId,
          type: 'INVITATION',
          status: 'PENDING',
        },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          type: 'AREA_INVITATION',
          senderId: userId,
          receiverId,
          content: `${invitation.sender?.name} te ha invitado a unirte al área "${invitation.area.name}"`,
        },
      });

      res.json(invitation);
    } catch (error) {
      console.error('Error sending invitation:', error);
      res.status(500).json({ error: 'Failed to send invitation' });
    }
  }

  // Request to join a private shareable area
  static async requestJoin(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { areaId } = req.body;

      if (!areaId) {
        return res.status(400).json({ error: 'Area ID is required' });
      }

      const area = await prisma.areaOfInterest.findUnique({
        where: { id: areaId },
      });

      if (!area) {
        return res.status(404).json({ error: 'Area not found' });
      }

      if (area.visibility !== 'PRIVATE_SHAREABLE') {
        return res.status(403).json({ error: 'This area does not accept join requests' });
      }

      // Check if already a member
      const existingMembership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId,
            userId,
          },
        },
      });

      if (existingMembership) {
        return res.status(409).json({ error: 'Already a member' });
      }

      // Check if request already exists
      const existingRequest = await prisma.areaInvitation.findFirst({
        where: {
          areaId,
          receiverId: userId,
          status: 'PENDING',
          type: 'JOIN_REQUEST',
        },
      });

      if (existingRequest) {
        return res.status(409).json({ error: 'Join request already sent' });
      }

      const request = await prisma.areaInvitation.create({
        data: {
          areaId,
          receiverId: area.creatorId, // Request goes to creator
          senderId: userId,
          type: 'JOIN_REQUEST',
          status: 'PENDING',
        },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create notification for area creator
      await prisma.notification.create({
        data: {
          type: 'AREA_JOIN_REQUEST',
          senderId: userId,
          receiverId: area.creatorId,
          content: `${request.sender?.name} ha solicitado unirse al área "${request.area.name}"`,
        },
      });

      res.json(request);
    } catch (error) {
      console.error('Error requesting to join area:', error);
      res.status(500).json({ error: 'Failed to request join' });
    }
  }

  // Get pending invitations for current user
  static async getMyInvitations(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const invitations = await prisma.areaInvitation.findMany({
        where: {
          receiverId: userId,
          status: 'PENDING',
          type: 'INVITATION',
        },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              description: true,
              visibility: true,
            },
          },
          sender: {
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

      res.json(invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ error: 'Failed to fetch invitations' });
    }
  }

  // Get pending join requests for an area (admin only)
  static async getAreaRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { areaId } = req.params;

      // Check if user is admin
      const adminMembership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId,
            userId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can view join requests' });
      }

      const requests = await prisma.areaInvitation.findMany({
        where: {
          areaId,
          status: 'PENDING',
          type: 'JOIN_REQUEST',
        },
        include: {
          sender: {
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

      res.json(requests);
    } catch (error) {
      console.error('Error fetching join requests:', error);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  }

  // Accept an invitation or join request
  static async accept(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const invitation = await prisma.areaInvitation.findUnique({
        where: { id },
        include: {
          area: true,
        },
      });

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      // Different authorization based on type
      if (invitation.type === 'INVITATION') {
        // User accepting their own invitation
        if (invitation.receiverId !== userId) {
          return res.status(403).json({ error: 'Not authorized' });
        }
      } else if (invitation.type === 'JOIN_REQUEST') {
        // Admin accepting a join request
        const adminMembership = await prisma.areaMembership.findUnique({
          where: {
            areaId_userId: {
              areaId: invitation.areaId,
              userId,
            },
          },
        });

        if (!adminMembership || adminMembership.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Only admins can accept join requests' });
        }
      }

      // Check if invitation is already accepted
      if (invitation.status !== 'PENDING') {
        return res.status(400).json({ error: 'Esta invitación ya fue procesada' });
      }

      // Add user as member
      const newMemberId =
        invitation.type === 'INVITATION' ? invitation.receiverId : invitation.senderId!;

      // Check if user is already a member
      const existingMembership = await prisma.areaMembership.findUnique({
        where: {
          areaId_userId: {
            areaId: invitation.areaId,
            userId: newMemberId,
          },
        },
      });

      if (existingMembership) {
        // User is already a member, just delete the invitation
        await prisma.areaInvitation.delete({
          where: { id },
        });
        return res.json({
          message: 'El usuario ya es miembro del área',
          areaId: invitation.areaId,
          areaName: invitation.area.name,
          userId: newMemberId
        });
      }

      // Delete old invitations with same areaId/receiverId/status to avoid unique constraint issues
      await prisma.areaInvitation.deleteMany({
        where: {
          areaId: invitation.areaId,
          receiverId: newMemberId,
          status: 'ACCEPTED',
        },
      });

      // Create membership and delete the invitation in a transaction
      await prisma.$transaction([
        prisma.areaMembership.create({
          data: {
            areaId: invitation.areaId,
            userId: newMemberId,
            role: 'MEMBER',
          },
        }),
        prisma.areaInvitation.delete({
          where: { id },
        }),
      ]);

      // Create notification for the user who was accepted (only if it's not the same user)
      if (newMemberId !== userId) {
        await prisma.notification.create({
          data: {
            type: 'AREA_JOIN_ACCEPTED',
            senderId: userId,
            receiverId: newMemberId,
            areaId: invitation.areaId,
            content: `Tu solicitud para unirte a "${invitation.area.name}" fue aceptada`,
          },
        });
      }

      res.json({ message: 'Invitation accepted successfully', areaId: invitation.areaId, areaName: invitation.area.name, userId: newMemberId });
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);

      // Send more detailed error to client
      const errorMessage = error.message || 'Failed to accept invitation';
      res.status(500).json({ error: errorMessage, details: error.toString() });
    }
  }

  // Reject an invitation or join request
  static async reject(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const invitation = await prisma.areaInvitation.findUnique({
        where: { id },
      });

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      // Different authorization based on type
      if (invitation.type === 'INVITATION') {
        // User rejecting their own invitation
        if (invitation.receiverId !== userId) {
          return res.status(403).json({ error: 'Not authorized' });
        }
      } else if (invitation.type === 'JOIN_REQUEST') {
        // Admin rejecting a join request
        const adminMembership = await prisma.areaMembership.findUnique({
          where: {
            areaId_userId: {
              areaId: invitation.areaId,
              userId,
            },
          },
        });

        if (!adminMembership || adminMembership.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Only admins can reject join requests' });
        }
      }

      await prisma.areaInvitation.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      res.json({ message: 'Invitation rejected successfully' });
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      res.status(500).json({ error: 'Failed to reject invitation' });
    }
  }
}
