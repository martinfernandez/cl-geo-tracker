import { Request, Response } from 'express';
import { isS3Configured, uploadToS3, saveToLocal } from '../../middleware/upload';
import { processImage } from '../../services/imageService';
import { prisma } from '../../config/database';

interface AuthRequest extends Request {
  userId?: string;
}

export class UploadController {
  static async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const originalBuffer = file.buffer;

      // Compress image
      console.log('[Upload] Processing image, original size:', originalBuffer.length);
      const processed = await processImage(originalBuffer);
      console.log('[Upload] Compressed:', processed.originalSize, '->', processed.compressedSize,
        `(${Math.round((1 - processed.compressedSize / processed.originalSize) * 100)}% reduction)`);

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}.jpg`;

      let imageUrl: string;

      if (isS3Configured) {
        // Upload to S3
        const key = `events/${filename}`;
        imageUrl = await uploadToS3(processed.buffer, key, processed.mimetype);
        console.log('[Upload] Image uploaded to S3:', imageUrl);
      } else {
        // Save locally
        imageUrl = await saveToLocal(processed.buffer, filename);
        console.log('[Upload] Image saved locally:', imageUrl);
      }

      res.json({
        imageUrl,
        filename,
        originalSize: processed.originalSize,
        compressedSize: processed.compressedSize,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  // Upload group image (admin only)
  static async uploadGroupImage(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { groupId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Check if user is admin of the group
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo los administradores pueden cambiar la imagen del grupo' });
      }

      const file = req.file;
      const originalBuffer = file.buffer;

      // Compress image
      console.log('[Upload] Processing group image, original size:', originalBuffer.length);
      const processed = await processImage(originalBuffer);
      console.log('[Upload] Compressed:', processed.originalSize, '->', processed.compressedSize,
        `(${Math.round((1 - processed.compressedSize / processed.originalSize) * 100)}% reduction)`);

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `group-${groupId}-${uniqueSuffix}.jpg`;

      let imageUrl: string;

      if (isS3Configured) {
        const key = `groups/${filename}`;
        imageUrl = await uploadToS3(processed.buffer, key, processed.mimetype);
        console.log('[Upload] Group image uploaded to S3:', imageUrl);
      } else {
        imageUrl = await saveToLocal(processed.buffer, filename);
        console.log('[Upload] Group image saved locally:', imageUrl);
      }

      // Update group with new imageUrl
      const group = await prisma.group.update({
        where: { id: groupId },
        data: { imageUrl },
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
      console.error('Error uploading group image:', error);
      res.status(500).json({ error: 'Failed to upload group image' });
    }
  }

  // Upload profile image
  static async uploadProfileImage(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const originalBuffer = file.buffer;

      // Compress image
      console.log('[Upload] Processing profile image, original size:', originalBuffer.length);
      const processed = await processImage(originalBuffer);
      console.log('[Upload] Compressed:', processed.originalSize, '->', processed.compressedSize,
        `(${Math.round((1 - processed.compressedSize / processed.originalSize) * 100)}% reduction)`);

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `profile-${userId}-${uniqueSuffix}.jpg`;

      let imageUrl: string;

      if (isS3Configured) {
        const key = `profiles/${filename}`;
        imageUrl = await uploadToS3(processed.buffer, key, processed.mimetype);
        console.log('[Upload] Profile image uploaded to S3:', imageUrl);
      } else {
        imageUrl = await saveToLocal(processed.buffer, filename);
        console.log('[Upload] Profile image saved locally:', imageUrl);
      }

      // Update user with new imageUrl
      const user = await prisma.user.update({
        where: { id: userId },
        data: { imageUrl },
        select: {
          id: true,
          email: true,
          name: true,
          imageUrl: true,
        },
      });

      res.json(user);
    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ error: 'Failed to upload profile image' });
    }
  }
}
