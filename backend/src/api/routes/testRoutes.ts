import { Router } from 'express';
import { TestController } from '../controllers/testController';

export const testRouter = Router();

// Only enable in development
if (process.env.NODE_ENV === 'development') {
  testRouter.post('/position/:imei', TestController.createTestPosition);
  testRouter.post('/simulate/:imei', TestController.simulateMovement);
}
