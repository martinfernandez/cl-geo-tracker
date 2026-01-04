import { Router, Request, Response, NextFunction } from 'express';
import { UploadController } from '../controllers/uploadController';
import { authMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

export const uploadRouter = Router();

// Wrapper to handle multer errors with logging
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      console.error('[Upload] Multer error:', err.message);
      console.error('[Upload] Error details:', err);

      // S3 specific errors
      if (err.code === 'AccessDenied') {
        return res.status(500).json({ error: 'S3 access denied - check credentials and bucket permissions' });
      }
      if (err.code === 'NoSuchBucket') {
        return res.status(500).json({ error: 'S3 bucket does not exist' });
      }
      if (err.message?.includes('Only image files')) {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 10MB)' });
      }

      return res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
    next();
  });
};

uploadRouter.post(
  '/image',
  authMiddleware,
  handleUpload,
  UploadController.uploadImage
);
