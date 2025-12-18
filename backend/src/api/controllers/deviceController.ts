import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

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
            orderBy: { timestamp: 'desc' },
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
            orderBy: { timestamp: 'desc' },
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
      const { imei, name } = req.body;

      if (!imei) {
        return res.status(400).json({ error: 'IMEI is required' });
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
          imei,
          name: name || `JX10-${imei.slice(-4)}`,
          userId,
        },
      });

      res.status(201).json(device);
    } catch (error) {
      console.error('Error creating device:', error);
      res.status(500).json({ error: 'Failed to create device' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { name } = req.body;

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

      const device = await prisma.device.update({
        where: { id },
        data: { name },
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
}
