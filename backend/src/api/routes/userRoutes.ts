import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../../middleware/auth';

export const userRouter = Router();

userRouter.post('/register', UserController.register);
userRouter.post('/login', UserController.login);
userRouter.get('/profile', authMiddleware, UserController.getProfile);
userRouter.put('/area-of-interest', authMiddleware, UserController.updateAreaOfInterest);
