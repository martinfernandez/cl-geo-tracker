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
}
