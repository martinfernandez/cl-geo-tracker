import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { broadcastGroupPositionUpdate } from '../../websocket/wsServer';

export class PhoneLocationController {
  // Create or get phone device for user
  static async createDevice(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name } = req.body;

      // Check if user already has a phone device
      let phoneDevice = await prisma.phoneDevice.findUnique({
        where: { userId },
      });

      if (phoneDevice) {
        return res.json(phoneDevice);
      }

      // Create new phone device
      phoneDevice = await prisma.phoneDevice.create({
        data: {
          userId,
          name: name || 'Mi Teléfono',
          isActive: false,
        },
      });

      res.status(201).json(phoneDevice);
    } catch (error) {
      console.error('Error creating phone device:', error);
      res.status(500).json({ error: 'No se pudo crear el dispositivo' });
    }
  }

  // Get user's phone device
  static async getMyDevice(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const phoneDevice = await prisma.phoneDevice.findUnique({
        where: { userId },
        include: {
          positions: {
            take: 1,
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      if (!phoneDevice) {
        return res.status(404).json({ error: 'No tienes un dispositivo de teléfono configurado' });
      }

      res.json({
        ...phoneDevice,
        lastPosition: phoneDevice.positions[0] || null,
      });
    } catch (error) {
      console.error('Error fetching phone device:', error);
      res.status(500).json({ error: 'No se pudo cargar el dispositivo' });
    }
  }

  // Submit a single position
  static async submitPosition(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { latitude, longitude, altitude, speed, heading, accuracy, timestamp } = req.body;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Latitud y longitud son requeridos' });
      }

      // Get or create phone device
      let phoneDevice = await prisma.phoneDevice.findUnique({
        where: { userId },
      });

      if (!phoneDevice) {
        phoneDevice = await prisma.phoneDevice.create({
          data: {
            userId,
            isActive: true,
          },
        });
      }

      // Create position
      const position = await prisma.phonePosition.create({
        data: {
          phoneDeviceId: phoneDevice.id,
          latitude,
          longitude,
          altitude: altitude || null,
          speed: speed || null,
          heading: heading || null,
          accuracy: accuracy || null,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
      });

      // Update phone device
      await prisma.phoneDevice.update({
        where: { id: phoneDevice.id },
        data: {
          isActive: true,
          lastPositionAt: position.timestamp,
        },
      });

      // Broadcast to groups where user has location sharing enabled
      const memberships = await prisma.groupMembership.findMany({
        where: {
          userId,
          locationSharingEnabled: true,
        },
        select: { groupId: true },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      for (const membership of memberships) {
        broadcastGroupPositionUpdate(membership.groupId, {
          type: 'PHONE',
          deviceId: phoneDevice.id,
          deviceName: phoneDevice.name,
          userId,
          userName: user?.name,
          ...position,
        });
      }

      res.json(position);
    } catch (error) {
      console.error('Error submitting position:', error);
      res.status(500).json({ error: 'No se pudo guardar la posición' });
    }
  }

  // Submit batch of positions (from background location)
  static async submitBatchPositions(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { positions } = req.body;

      if (!Array.isArray(positions) || positions.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de posiciones' });
      }

      // Get or create phone device
      let phoneDevice = await prisma.phoneDevice.findUnique({
        where: { userId },
      });

      if (!phoneDevice) {
        phoneDevice = await prisma.phoneDevice.create({
          data: {
            userId,
            isActive: true,
          },
        });
      }

      // Insert all positions
      const createdPositions = await prisma.phonePosition.createMany({
        data: positions.map((pos: any) => ({
          phoneDeviceId: phoneDevice!.id,
          latitude: pos.latitude,
          longitude: pos.longitude,
          altitude: pos.altitude || null,
          speed: pos.speed || null,
          heading: pos.heading || null,
          accuracy: pos.accuracy || null,
          timestamp: pos.timestamp ? new Date(pos.timestamp) : new Date(),
        })),
      });

      // Get the latest position
      const latestPosition = positions.reduce((latest: any, pos: any) => {
        const posTime = pos.timestamp ? new Date(pos.timestamp).getTime() : 0;
        const latestTime = latest.timestamp ? new Date(latest.timestamp).getTime() : 0;
        return posTime > latestTime ? pos : latest;
      }, positions[0]);

      // Update phone device with latest position time
      await prisma.phoneDevice.update({
        where: { id: phoneDevice.id },
        data: {
          isActive: true,
          lastPositionAt: latestPosition.timestamp ? new Date(latestPosition.timestamp) : new Date(),
        },
      });

      // Broadcast latest position to groups
      const memberships = await prisma.groupMembership.findMany({
        where: {
          userId,
          locationSharingEnabled: true,
        },
        select: { groupId: true },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      for (const membership of memberships) {
        broadcastGroupPositionUpdate(membership.groupId, {
          type: 'PHONE',
          deviceId: phoneDevice.id,
          deviceName: phoneDevice.name,
          userId,
          userName: user?.name,
          latitude: latestPosition.latitude,
          longitude: latestPosition.longitude,
          altitude: latestPosition.altitude,
          speed: latestPosition.speed,
          heading: latestPosition.heading,
          accuracy: latestPosition.accuracy,
          timestamp: latestPosition.timestamp,
        });
      }

      res.json({
        message: `${createdPositions.count} posiciones guardadas`,
        count: createdPositions.count,
      });
    } catch (error) {
      console.error('Error submitting batch positions:', error);
      res.status(500).json({ error: 'No se pudieron guardar las posiciones' });
    }
  }

  // Toggle location sharing
  static async toggle(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'El parámetro enabled es requerido' });
      }

      let phoneDevice = await prisma.phoneDevice.findUnique({
        where: { userId },
      });

      if (!phoneDevice) {
        phoneDevice = await prisma.phoneDevice.create({
          data: {
            userId,
            isActive: enabled,
          },
        });
      } else {
        phoneDevice = await prisma.phoneDevice.update({
          where: { id: phoneDevice.id },
          data: { isActive: enabled },
        });
      }

      res.json({
        isActive: phoneDevice.isActive,
        message: enabled ? 'Ubicación activada' : 'Ubicación desactivada',
      });
    } catch (error) {
      console.error('Error toggling phone location:', error);
      res.status(500).json({ error: 'No se pudo cambiar la configuración' });
    }
  }

  // Get current status
  static async getStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const phoneDevice = await prisma.phoneDevice.findUnique({
        where: { userId },
        include: {
          positions: {
            take: 1,
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      if (!phoneDevice) {
        return res.json({
          hasDevice: false,
          isActive: false,
          lastPosition: null,
        });
      }

      res.json({
        hasDevice: true,
        isActive: phoneDevice.isActive,
        deviceName: phoneDevice.name,
        lastPosition: phoneDevice.positions[0] || null,
        lastPositionAt: phoneDevice.lastPositionAt,
      });
    } catch (error) {
      console.error('Error getting phone status:', error);
      res.status(500).json({ error: 'No se pudo obtener el estado' });
    }
  }

  // Update device name
  static async updateDevice(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre es requerido' });
      }

      const phoneDevice = await prisma.phoneDevice.update({
        where: { userId },
        data: { name: name.trim() },
      });

      res.json(phoneDevice);
    } catch (error) {
      console.error('Error updating phone device:', error);
      res.status(500).json({ error: 'No se pudo actualizar el dispositivo' });
    }
  }

  // Get position history
  static async getPositionHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { limit = '50', from, to } = req.query;

      const phoneDevice = await prisma.phoneDevice.findUnique({
        where: { userId },
      });

      if (!phoneDevice) {
        return res.status(404).json({ error: 'No tienes un dispositivo de teléfono' });
      }

      const where: any = { phoneDeviceId: phoneDevice.id };

      if (from) {
        where.timestamp = { ...where.timestamp, gte: new Date(from as string) };
      }
      if (to) {
        where.timestamp = { ...where.timestamp, lte: new Date(to as string) };
      }

      const positions = await prisma.phonePosition.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Math.min(parseInt(limit as string), 1000),
      });

      res.json(positions);
    } catch (error) {
      console.error('Error fetching position history:', error);
      res.status(500).json({ error: 'No se pudo cargar el historial' });
    }
  }
}
