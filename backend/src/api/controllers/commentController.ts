import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export class CommentController {
  // Create a comment or reply
  static async createComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;
      const { content, parentCommentId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'El comentario no puede estar vacío' });
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { user: true },
      });

      if (!event) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      // If it's a reply, check if parent comment exists
      if (parentCommentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentCommentId },
          include: { user: true },
        });

        if (!parentComment) {
          return res.status(404).json({ error: 'Comentario padre no encontrado' });
        }

        // Create reply
        const comment = await prisma.comment.create({
          data: {
            content: content.trim(),
            eventId,
            userId,
            parentCommentId,
          },
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

        // Create notification for parent comment author
        if (parentComment.userId !== userId) {
          const commentingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
          });
          const userName = commentingUser?.name || commentingUser?.email || 'Alguien';

          await prisma.notification.create({
            data: {
              type: 'COMMENT_REPLY',
              senderId: userId,
              receiverId: parentComment.userId,
              eventId,
              commentId: comment.id,
              content: `${userName} respondió a tu comentario`,
            },
          });
        }

        return res.status(201).json(comment);
      }

      // Create top-level comment
      const comment = await prisma.comment.create({
        data: {
          content: content.trim(),
          eventId,
          userId,
        },
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

      // Create notification for event owner
      if (event.userId !== userId) {
        const commentingUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        const userName = commentingUser?.name || commentingUser?.email || 'Alguien';

        await prisma.notification.create({
          data: {
            type: 'EVENT_COMMENT',
            senderId: userId,
            receiverId: event.userId,
            eventId,
            commentId: comment.id,
            content: `${userName} comentó en tu evento`,
          },
        });
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Error al crear comentario' });
    }
  }

  // Get comments for an event
  static async getEventComments(req: AuthRequest, res: Response) {
    try {
      const { eventId } = req.params;

      // Get all top-level comments with their replies
      const comments = await prisma.comment.findMany({
        where: {
          eventId,
          parentCommentId: null, // Only top-level comments
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          likes: {
            select: {
              id: true,
              userId: true,
              createdAt: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              likes: {
                select: {
                  id: true,
                  userId: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Error al obtener comentarios' });
    }
  }

  // Delete a comment
  static async deleteComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { commentId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { event: true },
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comentario no encontrado' });
      }

      // Only comment author or event owner can delete
      if (comment.userId !== userId && comment.event.userId !== userId) {
        return res.status(403).json({
          error: 'No tienes permisos para eliminar este comentario',
        });
      }

      // Delete comment (cascade will delete replies and notifications)
      await prisma.comment.delete({
        where: { id: commentId },
      });

      res.json({ message: 'Comentario eliminado' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Error al eliminar comentario' });
    }
  }

  // Get comment count for an event
  static async getCommentCount(req: AuthRequest, res: Response) {
    try {
      const { eventId } = req.params;

      const count = await prisma.comment.count({
        where: { eventId },
      });

      res.json({ count });
    } catch (error) {
      console.error('Error getting comment count:', error);
      res.status(500).json({ error: 'Error al contar comentarios' });
    }
  }

  // Toggle like on a comment
  static async toggleCommentLike(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { commentId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Check if comment exists
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { user: true },
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comentario no encontrado' });
      }

      // Check if user already liked this comment
      const existingLike = await prisma.commentLike.findUnique({
        where: {
          commentId_userId: {
            commentId,
            userId,
          },
        },
      });

      if (existingLike) {
        // Unlike
        await prisma.commentLike.delete({
          where: { id: existingLike.id },
        });

        return res.json({ liked: false, message: 'Like eliminado' });
      } else {
        // Like
        await prisma.commentLike.create({
          data: {
            commentId,
            userId,
          },
        });

        // Create notification for comment author
        if (comment.userId !== userId) {
          const likingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
          });
          const userName = likingUser?.name || likingUser?.email || 'Alguien';

          await prisma.notification.create({
            data: {
              type: 'COMMENT_LIKE',
              senderId: userId,
              receiverId: comment.userId,
              commentId,
              content: `A ${userName} le gusta tu comentario`,
            },
          });
        }

        return res.json({ liked: true, message: 'Like agregado' });
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      res.status(500).json({ error: 'Error al procesar like' });
    }
  }

  // Get likes for a comment
  static async getCommentLikes(req: AuthRequest, res: Response) {
    try {
      const { commentId } = req.params;

      const likes = await prisma.commentLike.findMany({
        where: { commentId },
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

      res.json(likes);
    } catch (error) {
      console.error('Error fetching comment likes:', error);
      res.status(500).json({ error: 'Error al obtener likes' });
    }
  }

  // Check if user liked a comment
  static async checkUserCommentLike(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { commentId } = req.params;

      if (!userId) {
        return res.json({ liked: false });
      }

      const like = await prisma.commentLike.findUnique({
        where: {
          commentId_userId: {
            commentId,
            userId,
          },
        },
      });

      res.json({ liked: !!like });
    } catch (error) {
      console.error('Error checking comment like:', error);
      res.status(500).json({ error: 'Error al verificar like' });
    }
  }
}
