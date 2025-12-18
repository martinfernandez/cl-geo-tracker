import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { authMiddleware } from '../../middleware/auth';

export const eventRouter = Router();

// All event routes require authentication
eventRouter.use(authMiddleware);

eventRouter.post('/', EventController.createEvent);
eventRouter.get('/', EventController.getEvents);
eventRouter.get('/public/region', EventController.getPublicEventsByRegion);
eventRouter.get('/public/:id', EventController.getPublicEventById);
eventRouter.get('/:id/positions', EventController.getEventPositions);
eventRouter.get('/:id', EventController.getEvent);
eventRouter.put('/:id', EventController.updateEvent);
eventRouter.delete('/:id', EventController.deleteEvent);
