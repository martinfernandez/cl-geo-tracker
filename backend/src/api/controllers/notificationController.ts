import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export class NotificationController {
  // Get user notifications
  static async getUserNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { unreadOnly } = req.query;

      const where: any = { receiverId: userId };
      if (unreadOnly === 'true') {
        where.isRead = false;
      }

      const notifications = await prisma.notification.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to last 50 notifications
      });

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
  }

  // Mark notification as read
  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }

      if (notification.receiverId !== userId) {
        return res.status(403).json({
          error: 'No tienes permisos para modificar esta notificación',
        });
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Error al marcar notificación como leída' });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      await prisma.notification.updateMany({
        where: {
          receiverId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });

      res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Error al marcar notificaciones como leídas' });
    }
  }

  // Get unread count
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const count = await prisma.notification.count({
        where: {
          receiverId: userId,
          isRead: false,
        },
      });

      res.json({ count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Error al obtener contador de notificaciones' });
    }
  }

  // Delete notification
  static async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }

      if (notification.receiverId !== userId) {
        return res.status(403).json({
          error: 'No tienes permisos para eliminar esta notificación',
        });
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      res.json({ message: 'Notificación eliminada' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Error al eliminar notificación' });
    }
  }
}
