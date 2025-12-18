import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { authMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

export const uploadRouter = Router();

uploadRouter.post(
  '/image',
  authMiddleware,
  upload.single('image'),
  UploadController.uploadImage
);
