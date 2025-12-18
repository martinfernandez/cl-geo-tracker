import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { authMiddleware } from '../../middleware/auth';

export const deviceRouter = Router();

deviceRouter.get('/', authMiddleware, DeviceController.getAll);
deviceRouter.get('/:id', authMiddleware, DeviceController.getById);
deviceRouter.post('/', authMiddleware, DeviceController.create);
deviceRouter.put('/:id', authMiddleware, DeviceController.update);
deviceRouter.delete('/:id', authMiddleware, DeviceController.delete);
