import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { generateToken } from '../../middleware/auth';

export class UserController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      const token = generateToken(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          areaOfInterestLatitude: true,
          areaOfInterestLongitude: true,
          areaOfInterestRadius: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  static async updateAreaOfInterest(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { latitude, longitude, radius } = req.body;

      if (latitude === undefined || longitude === undefined || radius === undefined) {
        return res.status(400).json({ error: 'Latitude, longitude and radius are required' });
      }

      // Validate radius (max 10km = 10000 meters)
      if (radius < 100 || radius > 10000) {
        return res.status(400).json({ error: 'Radius must be between 100 and 10000 meters' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          areaOfInterestLatitude: latitude,
          areaOfInterestLongitude: longitude,
          areaOfInterestRadius: radius,
        },
        select: {
          id: true,
          email: true,
          name: true,
          areaOfInterestLatitude: true,
          areaOfInterestLongitude: true,
          areaOfInterestRadius: true,
        },
      });

      res.json(user);
    } catch (error) {
      console.error('Error updating area of interest:', error);
      res.status(500).json({ error: 'Failed to update area of interest' });
    }
  }

  // Get user public profile (with privacy filtering)
  static async getPublicProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          showName: true,
          showEmail: true,
          showPublicEvents: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Apply privacy filtering
      const publicProfile = {
        id: user.id,
        name: user.showName ? user.name : 'Usuario Anónimo',
        email: user.showEmail ? user.email : undefined,
        showName: user.showName,
        showEmail: user.showEmail,
        showPublicEvents: user.showPublicEvents,
        createdAt: user.createdAt,
      };

      res.json(publicProfile);
    } catch (error) {
      console.error('Error getting public profile:', error);
      res.status(500).json({ error: 'Failed to get public profile' });
    }
  }

  // Get user's public events (filtered by privacy)
  static async getUserPublicEvents(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          showPublicEvents: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // If user has hidden their public events, return empty array
      if (!user.showPublicEvents) {
        return res.json([]);
      }

      // Get user's public events
      const events = await prisma.event.findMany({
        where: {
          userId,
          isPublic: true,
        },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              imei: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(events);
    } catch (error) {
      console.error('Error getting user public events:', error);
      res.status(500).json({ error: 'Failed to get user public events' });
    }
  }

  // Update own privacy settings
  static async updatePrivacySettings(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { showName, showEmail, showPublicEvents } = req.body;

      const data: any = {};
      if (showName !== undefined) data.showName = showName;
      if (showEmail !== undefined) data.showEmail = showEmail;
      if (showPublicEvents !== undefined) data.showPublicEvents = showPublicEvents;

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No privacy settings provided' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          showName: true,
          showEmail: true,
          showPublicEvents: true,
        },
      });

      res.json(user);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      res.status(500).json({ error: 'Failed to update privacy settings' });
    }
  }

  // Refresh token - generates a new token for an authenticated user
  static async refreshToken(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const token = generateToken(user.id);

      res.json({
        user,
        token,
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  // Register/update push token
  static async registerPushToken(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { token } = req.body;

      console.log(`[PUSH TOKEN] Received request to register push token for user ${userId}`);
      console.log(`[PUSH TOKEN] Token received: ${token ? token.substring(0, 30) + '...' : 'null/undefined'}`);

      if (!token) {
        console.log(`[PUSH TOKEN] No token provided, returning 400`);
        return res.status(400).json({ error: 'Push token is required' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          expoPushToken: token,
        },
        select: {
          id: true,
          expoPushToken: true,
        },
      });

      console.log(`[PUSH TOKEN] Successfully registered push token for user ${userId}`);
      res.json({ success: true, token: user.expoPushToken });
    } catch (error) {
      console.error('[PUSH TOKEN] Error registering push token:', error);
      res.status(500).json({ error: 'Failed to register push token' });
    }
  }
}
