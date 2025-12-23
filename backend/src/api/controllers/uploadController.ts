import { Request, Response } from 'express';
import { isS3Configured } from '../../middleware/upload';

// Extend Express.Multer.File to include S3 properties
interface S3File extends Express.Multer.File {
  location?: string; // S3 URL
  key?: string; // S3 key
}

export class UploadController {
  static uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file as S3File;
      let imageUrl: string;

      if (isS3Configured && file.location) {
        // S3 storage - use the full S3 URL
        imageUrl = file.location;
        console.log('[Upload] Image uploaded to S3:', imageUrl);
      } else {
        // Local storage - use relative path
        imageUrl = `/uploads/events/${file.filename}`;
        console.log('[Upload] Image uploaded locally:', imageUrl);
      }

      res.json({
        imageUrl,
        filename: file.filename || file.key,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }
}
