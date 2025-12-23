import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { sendGroupInvitationEmail } from '../../services/emailService';

export class GroupInvitationController {
  // Send invitation to existing user
  static async sendInvitation(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId, receiverId } = req.body;

      if (!groupId || !receiverId) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      // Check if sender is admin
      const adminMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden enviar invitaciones' });
      }

      // Check if receiver exists
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
      });

      if (!receiver) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Check if receiver is already a member
      const existingMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: receiverId,
          },
        },
      });

      if (existingMembership) {
        return res.status(409).json({ error: 'El usuario ya es miembro del grupo' });
      }

      // Check if invitation already exists
      const existingInvitation = await prisma.groupInvitation.findFirst({
        where: {
          groupId,
          receiverId,
          status: 'PENDING',
        },
      });

      if (existingInvitation) {
        return res.status(409).json({ error: 'Ya existe una invitación pendiente para este usuario' });
      }

      const invitation = await prisma.groupInvitation.create({
        data: {
          groupId,
          senderId: userId,
          receiverId,
          status: 'PENDING',
        },
        include: {
          group: {
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
          type: 'GROUP_INVITATION',
          senderId: userId,
          receiverId,
          content: `${invitation.sender?.name} te ha invitado a unirte al grupo "${invitation.group.name}"`,
        },
      });

      res.json(invitation);
    } catch (error) {
      console.error('Error sending group invitation:', error);
      res.status(500).json({ error: 'No se pudo enviar la invitación' });
    }
  }

  // Send invitation via email (for non-users)
  static async sendEmailInvitation(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId, email } = req.body;

      if (!groupId || !email) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
      }

      // Check if sender is admin
      const adminMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden enviar invitaciones' });
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      const sender = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Check if user with this email exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        // User exists, create regular invitation
        const existingMembership = await prisma.groupMembership.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMembership) {
          return res.status(409).json({ error: 'Este usuario ya es miembro del grupo' });
        }

        const existingInvitation = await prisma.groupInvitation.findFirst({
          where: {
            groupId,
            receiverId: existingUser.id,
            status: 'PENDING',
          },
        });

        if (existingInvitation) {
          return res.status(409).json({ error: 'Ya existe una invitación pendiente para este email' });
        }

        const invitation = await prisma.groupInvitation.create({
          data: {
            groupId,
            senderId: userId,
            receiverId: existingUser.id,
            status: 'PENDING',
          },
          include: {
            group: true,
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            type: 'GROUP_INVITATION',
            senderId: userId,
            receiverId: existingUser.id,
            content: `${invitation.sender?.name} te ha invitado a unirte al grupo "${invitation.group.name}"`,
          },
        });

        return res.json({
          message: 'Invitación enviada (usuario existente)',
          invitation,
          userExists: true,
        });
      }

      // User doesn't exist, create pending email invitation
      const existingPendingInvitation = await prisma.pendingEmailInvitation.findUnique({
        where: {
          email_groupId: {
            email: email.toLowerCase(),
            groupId,
          },
        },
      });

      if (existingPendingInvitation) {
        return res.status(409).json({ error: 'Ya existe una invitación pendiente para este email' });
      }

      // Create pending invitation (expires in 7 days)
      const pendingInvitation = await prisma.pendingEmailInvitation.create({
        data: {
          email: email.toLowerCase(),
          groupId,
          senderId: userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Also create a GroupInvitation with email field for tracking
      await prisma.groupInvitation.create({
        data: {
          groupId,
          senderId: userId,
          email: email.toLowerCase(),
          status: 'PENDING',
        },
      });

      // Send email
      try {
        await sendGroupInvitationEmail(
          email.toLowerCase(),
          sender?.name || 'Un usuario',
          group.name
        );
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails, invitation is still created
      }

      res.json({
        message: 'Invitación enviada por email',
        pendingInvitation,
        userExists: false,
      });
    } catch (error) {
      console.error('Error sending email invitation:', error);
      res.status(500).json({ error: 'No se pudo enviar la invitación' });
    }
  }

  // Get pending invitations for current user
  static async getMyInvitations(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const invitations = await prisma.groupInvitation.findMany({
        where: {
          receiverId: userId,
          status: 'PENDING',
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              _count: {
                select: { members: true },
              },
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
      console.error('Error fetching group invitations:', error);
      res.status(500).json({ error: 'No se pudieron cargar las invitaciones' });
    }
  }

  // Accept invitation
  static async accept(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const invitation = await prisma.groupInvitation.findUnique({
        where: { id },
        include: {
          group: true,
        },
      });

      if (!invitation) {
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }

      if (invitation.receiverId !== userId) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      if (invitation.status !== 'PENDING') {
        return res.status(400).json({ error: 'Esta invitación ya fue procesada' });
      }

      // Check if already a member
      const existingMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: invitation.groupId,
            userId,
          },
        },
      });

      if (existingMembership) {
        await prisma.groupInvitation.delete({ where: { id } });
        return res.json({
          message: 'Ya eres miembro de este grupo',
          groupId: invitation.groupId,
        });
      }

      // Get the accepting user's name
      const acceptingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      // Create membership and delete invitation
      await prisma.$transaction([
        prisma.groupMembership.create({
          data: {
            groupId: invitation.groupId,
            userId,
            role: 'MEMBER',
          },
        }),
        prisma.groupInvitation.delete({ where: { id } }),
      ]);

      // Create notification for sender
      if (invitation.senderId) {
        await prisma.notification.create({
          data: {
            type: 'GROUP_JOIN_ACCEPTED',
            senderId: userId,
            receiverId: invitation.senderId,
            content: `${acceptingUser?.name || 'Un usuario'} aceptó tu invitación al grupo "${invitation.group.name}"`,
          },
        });
      }

      res.json({
        message: 'Te has unido al grupo',
        groupId: invitation.groupId,
        groupName: invitation.group.name,
      });
    } catch (error) {
      console.error('Error accepting group invitation:', error);
      res.status(500).json({ error: 'No se pudo aceptar la invitación' });
    }
  }

  // Reject invitation
  static async reject(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const invitation = await prisma.groupInvitation.findUnique({
        where: { id },
      });

      if (!invitation) {
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }

      if (invitation.receiverId !== userId) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      await prisma.groupInvitation.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      res.json({ message: 'Invitación rechazada' });
    } catch (error) {
      console.error('Error rejecting group invitation:', error);
      res.status(500).json({ error: 'No se pudo rechazar la invitación' });
    }
  }

  // Search users to invite
  static async searchUsers(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId, query } = req.query;

      if (!groupId || !query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Faltan parámetros de búsqueda' });
      }

      // Check if user is admin of the group
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId as string,
            userId,
          },
        },
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden buscar usuarios' });
      }

      // Get current members and pending invitations
      const currentMembers = await prisma.groupMembership.findMany({
        where: { groupId: groupId as string },
        select: { userId: true },
      });

      const pendingInvitations = await prisma.groupInvitation.findMany({
        where: {
          groupId: groupId as string,
          status: 'PENDING',
          receiverId: { not: null },
        },
        select: { receiverId: true },
      });

      const excludeIds = [
        ...currentMembers.map((m) => m.userId),
        ...pendingInvitations.map((i) => i.receiverId!),
      ];

      // Search users by name or email
      const users = await prisma.user.findMany({
        where: {
          id: { notIn: excludeIds },
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: 10,
      });

      res.json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Error al buscar usuarios' });
    }
  }
}
