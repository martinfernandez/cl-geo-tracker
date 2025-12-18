import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { broadcastPositionUpdate } from '../../websocket/wsServer';

export class TestController {
  // Create test position for a device
  static async createTestPosition(req: Request, res: Response) {
    try {
      const { imei } = req.params;

      // Find device by IMEI
      const device = await prisma.device.findUnique({
        where: { imei },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Create a test position (Buenos Aires coordinates)
      const position = await prisma.position.create({
        data: {
          deviceId: device.id,
          latitude: -34.6037 + (Math.random() - 0.5) * 0.01, // Random near Buenos Aires
          longitude: -58.3816 + (Math.random() - 0.5) * 0.01,
          altitude: 25,
          speed: Math.random() * 60, // Random speed 0-60 km/h
          heading: Math.random() * 360,
          timestamp: new Date(),
        },
      });

      // Broadcast to WebSocket clients
      broadcastPositionUpdate({
        device,
        position,
      });

      res.json({
        message: 'Test position created',
        device,
        position,
      });
    } catch (error) {
      console.error('Error creating test position:', error);
      res.status(500).json({ error: 'Failed to create test position' });
    }
  }

  // Create multiple test positions (simulate movement)
  static async simulateMovement(req: Request, res: Response) {
    try {
      const { imei } = req.params;
      const count = parseInt(req.query.count as string) || 10;

      const device = await prisma.device.findUnique({
        where: { imei },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      const positions = [];
      let lat = -34.6037;
      let lon = -58.3816;

      for (let i = 0; i < count; i++) {
        // Simulate movement
        lat += (Math.random() - 0.5) * 0.001;
        lon += (Math.random() - 0.5) * 0.001;

        const position = await prisma.position.create({
          data: {
            deviceId: device.id,
            latitude: lat,
            longitude: lon,
            altitude: 25,
            speed: 30 + Math.random() * 20,
            heading: Math.random() * 360,
            timestamp: new Date(Date.now() - (count - i) * 60000), // 1 minute apart
          },
        });

        positions.push(position);
      }

      // Broadcast last position
      if (positions.length > 0) {
        broadcastPositionUpdate({
          device,
          position: positions[positions.length - 1],
        });
      }

      res.json({
        message: `Created ${positions.length} test positions`,
        device,
        positions: positions.slice(-5), // Return last 5
      });
    } catch (error) {
      console.error('Error simulating movement:', error);
      res.status(500).json({ error: 'Failed to simulate movement' });
    }
  }
}
