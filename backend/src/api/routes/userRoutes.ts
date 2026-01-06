import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { UploadController } from '../controllers/uploadController';
import { authMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

export const userRouter = Router();

userRouter.post('/register', UserController.register);
userRouter.post('/login', UserController.login);
userRouter.post('/refresh', authMiddleware, UserController.refreshToken);
userRouter.get('/profile', authMiddleware, UserController.getProfile);
userRouter.put('/area-of-interest', authMiddleware, UserController.updateAreaOfInterest);

// Profile image upload
userRouter.put('/profile/image', authMiddleware, upload.single('image'), UploadController.uploadProfileImage);

// Privacy and public profile routes
userRouter.get('/:userId/profile', UserController.getPublicProfile);
userRouter.get('/:userId/events', UserController.getUserPublicEvents);
userRouter.put('/privacy', authMiddleware, UserController.updatePrivacySettings);
userRouter.post('/push-token', authMiddleware, UserController.registerPushToken);
