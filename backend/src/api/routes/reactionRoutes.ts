import { Router } from 'express';
import { ReactionController } from '../controllers/reactionController';
import { authMiddleware } from '../../middleware/auth';

export const reactionRouter = Router();

// All reaction routes require authentication
reactionRouter.use(authMiddleware);

// Toggle reaction (like/unlike)
reactionRouter.post('/events/:eventId/reactions', ReactionController.toggleReaction);

// Get reactions for an event
reactionRouter.get('/events/:eventId/reactions', ReactionController.getEventReactions);

// Check if user has reacted to an event
reactionRouter.get('/events/:eventId/reactions/me', ReactionController.checkUserReaction);
