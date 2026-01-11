import { Request, Response } from 'express';
import { isS3Configured, uploadToS3, saveToLocal, isVideoMimetype, generateUniqueFilename } from '../../middleware/upload';
import { processImage } from '../../services/imageService';
import { processVideo, isSupportedVideoType, getMaxDuration } from '../../services/videoService';
import { prisma } from '../../config/database';
import { MediaType } from '@prisma/client';

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

  /**
   * Upload a single media file (image or video) for events
   * Returns the processed media info ready to be added to EventMedia
   */
  static async uploadEventMedia(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const isVideo = isVideoMimetype(file.mimetype);

      let mediaUrl: string;
      let thumbnailUrl: string | null = null;
      let duration: number | null = null;
      let mediaType: MediaType;

      if (isVideo) {
        // Process video
        console.log('[Upload] Processing video, original size:', file.buffer.length);

        try {
          const processed = await processVideo(file.buffer);
          duration = processed.duration;

          console.log('[Upload] Video processed, duration:', duration, 's');

          // Upload video
          const videoFilename = generateUniqueFilename('mp4');
          const thumbnailFilename = generateUniqueFilename('jpg');

          if (isS3Configured) {
            const videoKey = `events/videos/${videoFilename}`;
            const thumbnailKey = `events/thumbnails/${thumbnailFilename}`;

            mediaUrl = await uploadToS3(processed.buffer, videoKey, processed.mimetype);
            thumbnailUrl = await uploadToS3(processed.thumbnailBuffer, thumbnailKey, processed.thumbnailMimetype);

            console.log('[Upload] Video uploaded to S3:', mediaUrl);
          } else {
            mediaUrl = await saveToLocal(processed.buffer, videoFilename, 'events/videos');
            thumbnailUrl = await saveToLocal(processed.thumbnailBuffer, thumbnailFilename, 'events/thumbnails');

            console.log('[Upload] Video saved locally:', mediaUrl);
          }

          mediaType = 'VIDEO';
        } catch (videoError: any) {
          console.error('[Upload] Video processing error:', videoError.message);
          return res.status(400).json({
            error: videoError.message || 'Failed to process video',
            maxDuration: getMaxDuration(),
          });
        }
      } else {
        // Process image
        console.log('[Upload] Processing image, original size:', file.buffer.length);
        const processed = await processImage(file.buffer);
        console.log('[Upload] Compressed:', processed.originalSize, '->', processed.compressedSize,
          `(${Math.round((1 - processed.compressedSize / processed.originalSize) * 100)}% reduction)`);

        const filename = generateUniqueFilename('jpg');

        if (isS3Configured) {
          const key = `events/${filename}`;
          mediaUrl = await uploadToS3(processed.buffer, key, processed.mimetype);
          console.log('[Upload] Image uploaded to S3:', mediaUrl);
        } else {
          mediaUrl = await saveToLocal(processed.buffer, filename);
          console.log('[Upload] Image saved locally:', mediaUrl);
        }

        mediaType = 'IMAGE';
      }

      res.json({
        url: mediaUrl,
        thumbnailUrl,
        type: mediaType,
        duration,
      });
    } catch (error) {
      console.error('Error uploading event media:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  }

  /**
   * Upload multiple media files for an event (max 5)
   * This is used when creating/editing an event with multiple media
   */
  static async uploadMultipleEventMedia(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      if (files.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 media files allowed per event' });
      }

      const results: Array<{
        url: string;
        thumbnailUrl: string | null;
        type: MediaType;
        duration: number | null;
        order: number;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = isVideoMimetype(file.mimetype);

        let mediaUrl: string;
        let thumbnailUrl: string | null = null;
        let duration: number | null = null;
        let mediaType: MediaType;

        if (isVideo) {
          try {
            const processed = await processVideo(file.buffer);
            duration = processed.duration;

            const videoFilename = generateUniqueFilename('mp4');
            const thumbnailFilename = generateUniqueFilename('jpg');

            if (isS3Configured) {
              const videoKey = `events/videos/${videoFilename}`;
              const thumbnailKey = `events/thumbnails/${thumbnailFilename}`;

              mediaUrl = await uploadToS3(processed.buffer, videoKey, processed.mimetype);
              thumbnailUrl = await uploadToS3(processed.thumbnailBuffer, thumbnailKey, processed.thumbnailMimetype);
            } else {
              mediaUrl = await saveToLocal(processed.buffer, videoFilename, 'events/videos');
              thumbnailUrl = await saveToLocal(processed.thumbnailBuffer, thumbnailFilename, 'events/thumbnails');
            }

            mediaType = 'VIDEO';
          } catch (videoError: any) {
            return res.status(400).json({
              error: `Video ${i + 1}: ${videoError.message || 'Failed to process video'}`,
              maxDuration: getMaxDuration(),
            });
          }
        } else {
          const processed = await processImage(file.buffer);
          const filename = generateUniqueFilename('jpg');

          if (isS3Configured) {
            const key = `events/${filename}`;
            mediaUrl = await uploadToS3(processed.buffer, key, processed.mimetype);
          } else {
            mediaUrl = await saveToLocal(processed.buffer, filename);
          }

          mediaType = 'IMAGE';
        }

        results.push({
          url: mediaUrl,
          thumbnailUrl,
          type: mediaType,
          duration,
          order: i,
        });
      }

      res.json({ media: results });
    } catch (error) {
      console.error('Error uploading multiple event media:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  }
}
