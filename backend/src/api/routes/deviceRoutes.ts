import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { authMiddleware } from '../../middleware/auth';

export const deviceRouter = Router();

deviceRouter.get('/', authMiddleware, DeviceController.getAll);
deviceRouter.get('/:id', authMiddleware, DeviceController.getById);
deviceRouter.post('/', authMiddleware, DeviceController.create);
deviceRouter.put('/:id', authMiddleware, DeviceController.update);
deviceRouter.delete('/:id', authMiddleware, DeviceController.delete);

// Lock/Unlock endpoints
deviceRouter.post('/:id/lock', authMiddleware, DeviceController.lock);
deviceRouter.post('/:id/unlock', authMiddleware, DeviceController.unlock);
deviceRouter.patch('/:id/lock-radius', authMiddleware, DeviceController.updateLockRadius);

// QR Code endpoints
deviceRouter.get('/:id/qr', authMiddleware, DeviceController.getQR);
deviceRouter.put('/:id/qr', authMiddleware, DeviceController.toggleQR);
deviceRouter.post('/:id/qr/regenerate', authMiddleware, DeviceController.regenerateQR);

// GPS Interval control endpoints
deviceRouter.post('/:id/interval', authMiddleware, DeviceController.setGpsInterval);
deviceRouter.patch('/:id/interval-settings', authMiddleware, DeviceController.updateIntervalSettings);
