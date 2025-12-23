import { Router } from 'express';
import { deviceRouter } from './deviceRoutes';
import { positionRouter } from './positionRoutes';
import { testRouter } from './testRoutes';
import { userRouter } from './userRoutes';
import { eventRouter } from './eventRoutes';
import { uploadRouter } from './uploadRoutes';
import { reactionRouter } from './reactionRoutes';
import { commentRouter } from './commentRoutes';
import { notificationRouter } from './notificationRoutes';
import { areaOfInterestRouter } from './areaOfInterestRoutes';
import { messageRouter } from './messageRoutes';
import { groupRouter, phoneLocationRouter } from './groupRoutes';
import { qrRouter } from './qrRoutes';

export const apiRouter = Router();

// QR routes MUST be before catch-all routers (reactionRouter, commentRouter, messageRouter)
// to ensure public endpoints are not intercepted by their authMiddleware
apiRouter.use('/qr', qrRouter);

apiRouter.use('/users', userRouter);
apiRouter.use('/devices', deviceRouter);
apiRouter.use('/positions', positionRouter);
apiRouter.use('/events', eventRouter);
apiRouter.use('/upload', uploadRouter);
apiRouter.use('/test', testRouter);
apiRouter.use('/', reactionRouter);
apiRouter.use('/', commentRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/areas', areaOfInterestRouter);
apiRouter.use('/', messageRouter);
apiRouter.use('/groups', groupRouter);
apiRouter.use('/phone-device', phoneLocationRouter);
