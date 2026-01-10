import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { requestLocationFromUsers } from '../../websocket/wsServer';

export class GroupController {
  // Create a new group
  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name, description } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre del grupo es requerido' });
      }

      // Create group and add creator as admin
      const group = await prisma.group.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          creatorId: userId,
          members: {
            create: {
              userId,
              role: 'ADMIN',
            },
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
            select: { members: true },
          },
        },
      });

      res.status(201).json({
        ...group,
        memberCount: group._count.members,
        userRole: 'ADMIN',
      });
    } catch (error) {
      console.error('Error creating group:', error);
      res.status(500).json({ error: 'No se pudo crear el grupo' });
    }
  }

  // Get user's groups
  static async getMyGroups(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const memberships = await prisma.groupMembership.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              _count: {
                select: { members: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const groups = memberships.map((m) => ({
        ...m.group,
        memberCount: m.group._count.members,
        userRole: m.role,
        locationSharingEnabled: m.locationSharingEnabled,
      }));

      res.json(groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).json({ error: 'No se pudieron cargar los grupos' });
    }
  }

  // Get group by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if user is a member
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }

      const group = await prisma.group.findUnique({
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
            orderBy: {
              createdAt: 'asc',
            },
          },
          _count: {
            select: { members: true },
          },
        },
      });

      if (!group) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      res.json({
        ...group,
        memberCount: group._count.members,
        userRole: membership.role,
        locationSharingEnabled: membership.locationSharingEnabled,
      });
    } catch (error) {
      console.error('Error fetching group:', error);
      res.status(500).json({ error: 'No se pudo cargar el grupo' });
    }
  }

  // Update group
  static async update(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { name, description } = req.body;

      // Check if user is admin
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden editar el grupo' });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;

      const group = await prisma.group.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: { members: true },
          },
        },
      });

      res.json({
        ...group,
        memberCount: group._count.members,
        userRole: membership.role,
      });
    } catch (error) {
      console.error('Error updating group:', error);
      res.status(500).json({ error: 'No se pudo actualizar el grupo' });
    }
  }

  // Delete group (creator only)
  static async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const group = await prisma.group.findUnique({
        where: { id },
      });

      if (!group) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      if (group.creatorId !== userId) {
        return res.status(403).json({ error: 'Solo el creador puede eliminar el grupo' });
      }

      await prisma.group.delete({
        where: { id },
      });

      res.json({ message: 'Grupo eliminado correctamente' });
    } catch (error) {
      console.error('Error deleting group:', error);
      res.status(500).json({ error: 'No se pudo eliminar el grupo' });
    }
  }

  // Leave group
  static async leave(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const group = await prisma.group.findUnique({
        where: { id },
      });

      if (!group) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      // Creator cannot leave, they must delete the group
      if (group.creatorId === userId) {
        return res.status(400).json({ error: 'El creador no puede abandonar el grupo. Debes eliminarlo o transferir la propiedad.' });
      }

      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(400).json({ error: 'No eres miembro de este grupo' });
      }

      await prisma.groupMembership.delete({
        where: { id: membership.id },
      });

      res.json({ message: 'Has salido del grupo' });
    } catch (error) {
      console.error('Error leaving group:', error);
      res.status(500).json({ error: 'No se pudo salir del grupo' });
    }
  }

  // Remove member (admin only)
  static async removeMember(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id, memberId } = req.params;

      // Check if current user is admin
      const adminMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden remover miembros' });
      }

      const group = await prisma.group.findUnique({
        where: { id },
      });

      if (!group) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      // Cannot remove creator
      if (memberId === group.creatorId) {
        return res.status(400).json({ error: 'No se puede remover al creador del grupo' });
      }

      const targetMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId: memberId,
          },
        },
      });

      if (!targetMembership) {
        return res.status(404).json({ error: 'El usuario no es miembro del grupo' });
      }

      await prisma.groupMembership.delete({
        where: { id: targetMembership.id },
      });

      res.json({ message: 'Miembro removido correctamente' });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'No se pudo remover al miembro' });
    }
  }

  // Update member role (admin only)
  static async updateMemberRole(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id, memberId } = req.params;
      const { role } = req.body;

      if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      // Check if current user is admin
      const adminMembership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden cambiar roles' });
      }

      const group = await prisma.group.findUnique({
        where: { id },
      });

      if (!group) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      // Cannot change creator's role
      if (memberId === group.creatorId) {
        return res.status(400).json({ error: 'No se puede cambiar el rol del creador' });
      }

      const updatedMembership = await prisma.groupMembership.update({
        where: {
          groupId_userId: {
            groupId: id,
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

      res.json(updatedMembership);
    } catch (error) {
      console.error('Error updating member role:', error);
      res.status(500).json({ error: 'No se pudo cambiar el rol' });
    }
  }

  // Toggle location sharing for current user
  static async toggleLocationSharing(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { enabled } = req.body;

      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'No eres miembro de este grupo' });
      }

      const updatedMembership = await prisma.groupMembership.update({
        where: { id: membership.id },
        data: { locationSharingEnabled: enabled },
      });

      res.json({ locationSharingEnabled: updatedMembership.locationSharingEnabled });
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      res.status(500).json({ error: 'No se pudo cambiar la configuración' });
    }
  }

  // Get devices of group members (only those with location sharing enabled)
  static async getDevices(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if user is a member
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }

      // Get all members with location sharing enabled
      const membersWithLocationSharing = await prisma.groupMembership.findMany({
        where: {
          groupId: id,
          locationSharingEnabled: true,
        },
        select: {
          userId: true,
        },
      });

      const memberIds = membersWithLocationSharing.map((m) => m.userId);

      // Get JX10 devices from these members
      const devices = await prisma.device.findMany({
        where: {
          userId: { in: memberIds },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          positions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Get phone devices from these members
      const phoneDevices = await prisma.phoneDevice.findMany({
        where: {
          userId: { in: memberIds },
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          positions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Format response
      const formattedDevices = devices.map((d) => ({
        id: d.id,
        type: 'JX10',
        name: d.name || (d.imei ? `JX10-${d.imei.slice(-4)}` : 'Dispositivo'),
        imei: d.imei,
        userId: d.userId,
        userName: d.user?.name,
        lastPosition: d.positions[0] || null,
      }));

      const formattedPhoneDevices = phoneDevices.map((p) => ({
        id: p.id,
        type: 'PHONE',
        name: p.name,
        userId: p.userId,
        userName: p.user?.name,
        lastPosition: p.positions[0] || null,
      }));

      res.json([...formattedDevices, ...formattedPhoneDevices]);
    } catch (error) {
      console.error('Error fetching group devices:', error);
      res.status(500).json({ error: 'No se pudieron cargar los dispositivos' });
    }
  }

  // Get events assigned to this group
  static async getEvents(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if user is a member
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }

      // Get events that are specifically assigned to this group
      const events = await prisma.event.findMany({
        where: {
          groupId: id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          device: {
            select: {
              id: true,
              name: true,
              imei: true,
            },
          },
          _count: {
            select: {
              reactions: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Add creatorName for display in group mode
      const formattedEvents = events.map((event) => ({
        ...event,
        creatorName: event.user?.name,
      }));

      res.json(formattedEvents);
    } catch (error) {
      console.error('Error fetching group events:', error);
      res.status(500).json({ error: 'No se pudieron cargar los eventos' });
    }
  }

  // Get all positions from group members (for map)
  static async getPositions(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      console.log('[getPositions] Starting for group:', id, 'requested by user:', userId);

      // Check if user is a member
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId,
          },
        },
      });

      if (!membership) {
        console.log('[getPositions] User not a member');
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }

      // Get all members with location sharing enabled
      const membersWithLocationSharing = await prisma.groupMembership.findMany({
        where: {
          groupId: id,
          locationSharingEnabled: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      console.log('[getPositions] Members with location sharing:', membersWithLocationSharing.map(m => ({ userId: m.userId, name: m.user.name })));

      // Request fresh location from all group members (on-demand update)
      // This sends WebSocket message to connected clients asking them to submit their current location
      const memberIds = membersWithLocationSharing.map(m => m.userId);
      if (memberIds.length > 0) {
        requestLocationFromUsers(memberIds, userId);
      }

      const positions: any[] = [];

      for (const member of membersWithLocationSharing) {
        console.log('[getPositions] Processing member:', member.user.name, '(', member.userId, ')');

        // Get latest position from JX10 devices
        const devices = await prisma.device.findMany({
          where: { userId: member.userId },
          include: {
            positions: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        console.log('[getPositions]   JX10 devices found:', devices.length);
        for (const device of devices) {
          if (device.positions.length > 0) {
            const pos = device.positions[0];
            positions.push({
              type: 'JX10',
              deviceId: device.id,
              deviceName: device.name || (device.imei ? `JX10-${device.imei.slice(-4)}` : 'Dispositivo'),
              memberId: member.userId,
              memberName: member.user.name,
              userId: member.userId,
              userName: member.user.name,
              positionId: pos.id,
              latitude: pos.latitude,
              longitude: pos.longitude,
              altitude: pos.altitude,
              speed: pos.speed,
              heading: pos.heading,
              timestamp: pos.timestamp,
            });
          }
        }

        // Get latest position from phone device
        const phoneDevice = await prisma.phoneDevice.findUnique({
          where: { userId: member.userId },
          include: {
            positions: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        console.log('[getPositions]   PhoneDevice found:', !!phoneDevice, 'isActive:', phoneDevice?.isActive, 'positions:', phoneDevice?.positions?.length);

        if (phoneDevice?.isActive && phoneDevice.positions.length > 0) {
          const pos = phoneDevice.positions[0];
          console.log('[getPositions]   Adding PHONE position for', member.user.name, ':', pos.latitude, pos.longitude);
          positions.push({
            type: 'PHONE',
            deviceId: phoneDevice.id,
            deviceName: phoneDevice.name,
            memberId: member.userId,
            memberName: member.user.name,
            userId: member.userId,
            userName: member.user.name,
            positionId: pos.id,
            latitude: pos.latitude,
            longitude: pos.longitude,
            altitude: pos.altitude,
            speed: pos.speed,
            heading: pos.heading,
            accuracy: pos.accuracy,
            timestamp: pos.timestamp,
          });
        }
      }

      console.log('[getPositions] Group:', id, 'Returning', positions.length, 'positions');
      console.log('[getPositions] Final positions:', JSON.stringify(positions.map(p => ({ memberName: p.memberName, type: p.type, lat: p.latitude, lon: p.longitude })), null, 2));
      res.json(positions);
    } catch (error) {
      console.error('Error fetching group positions:', error);
      res.status(500).json({ error: 'No se pudieron cargar las posiciones' });
    }
  }

  // Get groups where user is ADMIN (for event creation)
  static async getMyAdminGroups(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const memberships = await prisma.groupMembership.findMany({
        where: {
          userId,
          role: 'ADMIN',
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const groups = memberships.map((m) => m.group);
      res.json(groups);
    } catch (error) {
      console.error('Error fetching admin groups:', error);
      res.status(500).json({ error: 'No se pudieron cargar los grupos' });
    }
  }

  // Get or create group chat conversation
  static async getOrCreateGroupChat(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id: groupId } = req.params;

      // Verify user is a member of the group
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'No tienes acceso a este grupo' });
      }

      // Check if conversation already exists
      let conversation = await prisma.conversation.findFirst({
        where: { groupId },
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
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // If conversation doesn't exist, create it with all group members
      if (!conversation) {
        const groupMembers = await prisma.groupMembership.findMany({
          where: { groupId },
          select: { userId: true },
        });

        conversation = await prisma.conversation.create({
          data: {
            groupId,
            isGroupChat: true,
            participants: {
              create: groupMembers.map((m) => ({
                userId: m.userId,
              })),
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
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error getting/creating group chat:', error);
      res.status(500).json({ error: 'No se pudo obtener el chat del grupo' });
    }
  }
}
