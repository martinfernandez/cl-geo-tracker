import { Router, Request, Response, NextFunction } from 'express';
import { UploadController } from '../controllers/uploadController';
import { authMiddleware } from '../../middleware/auth';
import { upload, uploadMedia } from '../../middleware/upload';

export const uploadRouter = Router();

// Wrapper to handle multer errors with logging (images only)
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

// Wrapper to handle media (image + video) uploads
const handleMediaUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMedia.single('media')(req, res, (err: any) => {
    if (err) {
      console.error('[Upload] Media upload error:', err.message);

      if (err.code === 'AccessDenied') {
        return res.status(500).json({ error: 'S3 access denied - check credentials and bucket permissions' });
      }
      if (err.code === 'NoSuchBucket') {
        return res.status(500).json({ error: 'S3 bucket does not exist' });
      }
      if (err.message?.includes('Only image and video files')) {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 50MB for videos)' });
      }

      return res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
    next();
  });
};

// Wrapper to handle multiple media uploads (max 5)
const handleMultipleMediaUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMedia.array('media', 5)(req, res, (err: any) => {
    if (err) {
      console.error('[Upload] Multiple media upload error:', err.message);

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 50MB for videos)' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Maximum 5 files allowed' });
      }
      if (err.message?.includes('Only image and video files')) {
        return res.status(400).json({ error: err.message });
      }

      return res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
    next();
  });
};

// Image upload (legacy endpoint)
uploadRouter.post(
  '/image',
  authMiddleware,
  handleUpload,
  UploadController.uploadImage
);

// Single media upload (image or video)
uploadRouter.post(
  '/media',
  authMiddleware,
  handleMediaUpload,
  UploadController.uploadEventMedia
);

// Multiple media upload (max 5 files)
uploadRouter.post(
  '/media/multiple',
  authMiddleware,
  handleMultipleMediaUpload,
  UploadController.uploadMultipleEventMedia
);
