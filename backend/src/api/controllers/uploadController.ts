import { Request, Response } from 'express';

export class UploadController {
  static uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const imageUrl = `/uploads/events/${req.file.filename}`;

      res.json({
        imageUrl,
        filename: req.file.filename,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }
}
