import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { sendPushNotification } from '../../services/pushNotificationService';
import { DeviceType } from '@prisma/client';
import { setDeviceInterval } from '../../services/deviceCommandService';

export class DeviceController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      // Get devices owned by user or devices with no owner (available to claim)
      const devices = await prisma.device.findMany({
        where: {
          OR: [
            { userId },
            { userId: null },
          ],
        },
        include: {
          positions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      res.json(devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ error: 'Failed to fetch devices' });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const device = await prisma.device.findFirst({
        where: {
          id,
          OR: [
            { userId },
            { userId: null },
          ],
        },
        include: {
          positions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      res.json(device);
    } catch (error) {
      console.error('Error fetching device:', error);
      res.status(500).json({ error: 'Failed to fetch device' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { imei, name, color, type = 'GPS_TRACKER' } = req.body;

      // Validate type
      if (type !== 'GPS_TRACKER' && type !== 'TAGGED_OBJECT') {
        return res.status(400).json({ error: 'Invalid device type. Must be GPS_TRACKER or TAGGED_OBJECT' });
      }

      if (type === 'GPS_TRACKER') {
        // GPS_TRACKER requires IMEI
        if (!imei) {
          return res.status(400).json({ error: 'IMEI is required for GPS tracker devices' });
        }

        // Check if device already exists
        const existing = await prisma.device.findUnique({
          where: { imei },
        });

        if (existing) {
          return res.status(409).json({ error: 'Device with this IMEI already exists' });
        }

        const device = await prisma.device.create({
          data: {
            type: DeviceType.GPS_TRACKER,
            imei,
            name: name || `JX10-${imei.slice(-4)}`,
            color: color || '#007AFF',
            userId,
          },
        });

        return res.status(201).json(device);
      } else {
        // TAGGED_OBJECT - no IMEI required, just a name
        if (!name) {
          return res.status(400).json({ error: 'Name is required for tagged objects' });
        }

        const device = await prisma.device.create({
          data: {
            type: DeviceType.TAGGED_OBJECT,
            name,
            color: color || '#FF9500', // Orange default for tagged objects
            userId,
          },
        });

        return res.status(201).json(device);
      }
    } catch (error) {
      console.error('Error creating device:', error);
      res.status(500).json({ error: 'Failed to create device' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { name, color } = req.body;

      // Check if device exists and is owned by user
      const existingDevice = await prisma.device.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      const updateData: { name?: string; color?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;

      const device = await prisma.device.update({
        where: { id },
        data: updateData,
      });

      res.json(device);
    } catch (error) {
      console.error('Error updating device:', error);
      res.status(500).json({ error: 'Failed to update device' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if device exists and is owned by user
      const existingDevice = await prisma.device.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      await prisma.device.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting device:', error);
      res.status(500).json({ error: 'Failed to delete device' });
    }
  }

  // Lock device at current position with optional radius
  static async lock(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { radius = 0 } = req.body; // Default 0 = no movement allowed

      // Check if device exists and is owned by user
      const existingDevice = await prisma.device.findFirst({
        where: { id, userId },
        include: {
          positions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      // Get current position
      const lastPosition = existingDevice.positions[0];
      if (!lastPosition) {
        return res.status(400).json({ error: 'No position data available to lock device' });
      }

      const device = await prisma.device.update({
        where: { id },
        data: {
          isLocked: true,
          lockLatitude: lastPosition.latitude,
          lockLongitude: lastPosition.longitude,
          lockRadius: radius,
          lockedAt: new Date(),
          lastAlertAt: new Date(), // Set to now to skip first alert (cooldown prevents immediate false alerts)
        },
        include: {
          positions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      res.json(device);
    } catch (error) {
      console.error('Error locking device:', error);
      res.status(500).json({ error: 'Failed to lock device' });
    }
  }

  // Unlock device
  static async unlock(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if device exists and is owned by user
      const existingDevice = await prisma.device.findFirst({
        where: { id, userId },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      const device = await prisma.device.update({
        where: { id },
        data: {
          isLocked: false,
          lockLatitude: null,
          lockLongitude: null,
          lockRadius: 0,
          lockedAt: null,
          lastAlertAt: null,
        },
        include: {
          positions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      res.json(device);
    } catch (error) {
      console.error('Error unlocking device:', error);
      res.status(500).json({ error: 'Failed to unlock device' });
    }
  }

  // Update lock radius
  static async updateLockRadius(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { radius } = req.body;

      if (radius === undefined || radius < 0) {
        return res.status(400).json({ error: 'Valid radius is required' });
      }

      // Check if device exists and is owned by user
      const existingDevice = await prisma.device.findFirst({
        where: { id, userId },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      const device = await prisma.device.update({
        where: { id },
        data: { lockRadius: radius },
        include: {
          positions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      res.json(device);
    } catch (error) {
      console.error('Error updating lock radius:', error);
      res.status(500).json({ error: 'Failed to update lock radius' });
    }
  }

  // Get QR info for a device
  static async getQR(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      let device = await prisma.device.findFirst({
        where: { id, userId },
        select: {
          id: true,
          name: true,
          type: true,
          qrCode: true,
          qrEnabled: true,
        },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      // Auto-generate QR code if device doesn't have one
      if (!device.qrCode) {
        const crypto = require('crypto');
        const newQrCode = crypto.randomUUID();

        device = await prisma.device.update({
          where: { id },
          data: {
            qrCode: newQrCode,
            qrEnabled: true,
          },
          select: {
            id: true,
            name: true,
            type: true,
            qrCode: true,
            qrEnabled: true,
          },
        });
      }

      res.json(device);
    } catch (error) {
      console.error('Error getting device QR:', error);
      res.status(500).json({ error: 'Failed to get device QR' });
    }
  }

  // Toggle QR enabled status
  static async toggleQR(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }

      const existingDevice = await prisma.device.findFirst({
        where: { id, userId },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      const device = await prisma.device.update({
        where: { id },
        data: { qrEnabled: enabled },
        select: {
          id: true,
          name: true,
          type: true,
          qrCode: true,
          qrEnabled: true,
        },
      });

      res.json(device);
    } catch (error) {
      console.error('Error toggling device QR:', error);
      res.status(500).json({ error: 'Failed to toggle device QR' });
    }
  }

  // Regenerate QR code for a device
  static async regenerateQR(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const existingDevice = await prisma.device.findFirst({
        where: { id, userId },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      // Generate new UUID for qrCode
      const crypto = require('crypto');
      const newQrCode = crypto.randomUUID();

      const device = await prisma.device.update({
        where: { id },
        data: { qrCode: newQrCode },
        select: {
          id: true,
          name: true,
          type: true,
          qrCode: true,
          qrEnabled: true,
        },
      });

      res.json(device);
    } catch (error) {
      console.error('Error regenerating device QR:', error);
      res.status(500).json({ error: 'Failed to regenerate device QR' });
    }
  }

  // Set GPS device upload interval (sends command immediately if connected)
  static async setGpsInterval(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { intervalSeconds } = req.body;

      if (!intervalSeconds || intervalSeconds < 10) {
        return res.status(400).json({ error: 'intervalSeconds must be at least 10' });
      }

      // Check if device exists and is owned by user
      const existingDevice = await prisma.device.findFirst({
        where: { id, userId },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      if (existingDevice.type !== 'GPS_TRACKER') {
        return res.status(400).json({ error: 'Device is not a GPS tracker' });
      }

      // Send interval command to device
      const result = await setDeviceInterval(id, intervalSeconds);

      res.json({
        device: existingDevice,
        ...result,
      });
    } catch (error) {
      console.error('Error setting device interval:', error);
      res.status(500).json({ error: 'Failed to set device interval' });
    }
  }

  // Update interval settings for a GPS device (active/idle intervals)
  static async updateIntervalSettings(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { activeInterval, idleInterval } = req.body;

      // Validate inputs
      if (activeInterval !== undefined && activeInterval < 10) {
        return res.status(400).json({ error: 'activeInterval must be at least 10 seconds' });
      }
      if (idleInterval !== undefined && idleInterval < 10) {
        return res.status(400).json({ error: 'idleInterval must be at least 10 seconds' });
      }

      // Check if device exists and is owned by user
      const existingDevice = await prisma.device.findFirst({
        where: { id, userId },
      });

      if (!existingDevice) {
        return res.status(404).json({ error: 'Device not found or not owned by user' });
      }

      if (existingDevice.type !== 'GPS_TRACKER') {
        return res.status(400).json({ error: 'Device is not a GPS tracker' });
      }

      const updateData: { activeInterval?: number; idleInterval?: number } = {};
      if (activeInterval !== undefined) updateData.activeInterval = activeInterval;
      if (idleInterval !== undefined) updateData.idleInterval = idleInterval;

      const device = await prisma.device.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          type: true,
          activeInterval: true,
          idleInterval: true,
          currentInterval: true,
        },
      });

      res.json(device);
    } catch (error) {
      console.error('Error updating interval settings:', error);
      res.status(500).json({ error: 'Failed to update interval settings' });
    }
  }
}
