import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export class ReactionController {
  // Toggle reaction (like/unlike)
  static async toggleReaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { user: true },
      });

      if (!event) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      // Check if user already reacted
      const existingReaction = await prisma.reaction.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });

      if (existingReaction) {
        // Unlike - remove reaction
        await prisma.reaction.delete({
          where: { id: existingReaction.id },
        });

        return res.json({ liked: false, message: 'Reacción eliminada' });
      } else {
        // Like - create reaction
        await prisma.reaction.create({
          data: {
            eventId,
            userId,
          },
        });

        // Create notification for event owner (if not reacting to own event)
        if (event.userId !== userId) {
          // Get the user who reacted to include their name
          const reactingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
          });

          const userName = reactingUser?.name || reactingUser?.email || 'Alguien';

          await prisma.notification.create({
            data: {
              type: 'EVENT_REACTION',
              senderId: userId,
              receiverId: event.userId,
              eventId,
              content: `${userName} le gustó tu evento`,
            },
          });
        }

        return res.json({ liked: true, message: 'Reacción agregada' });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      res.status(500).json({ error: 'Error al procesar la reacción' });
    }
  }

  // Get reactions for an event
  static async getEventReactions(req: AuthRequest, res: Response) {
    try {
      const { eventId } = req.params;

      const reactions = await prisma.reaction.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const count = reactions.length;
      const userIds = reactions.map((r) => r.userId);

      res.json({
        count,
        reactions,
        userIds,
      });
    } catch (error) {
      console.error('Error fetching reactions:', error);
      res.status(500).json({ error: 'Error al obtener reacciones' });
    }
  }

  // Check if user has reacted to an event
  static async checkUserReaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const reaction = await prisma.reaction.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });

      res.json({ liked: !!reaction });
    } catch (error) {
      console.error('Error checking user reaction:', error);
      res.status(500).json({ error: 'Error al verificar reacción' });
    }
  }
}
