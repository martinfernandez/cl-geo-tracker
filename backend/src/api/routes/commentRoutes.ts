import { Router } from 'express';
import { CommentController } from '../controllers/commentController';
import { authMiddleware } from '../../middleware/auth';

export const commentRouter = Router();

// All comment routes require authentication
commentRouter.use(authMiddleware);

// Create comment or reply
commentRouter.post('/events/:eventId/comments', CommentController.createComment);

// Get comments for an event
commentRouter.get('/events/:eventId/comments', CommentController.getEventComments);

// Get comment count for an event
commentRouter.get('/events/:eventId/comments/count', CommentController.getCommentCount);

// Delete comment
commentRouter.delete('/comments/:commentId', CommentController.deleteComment);

// Like/unlike a comment
commentRouter.post('/comments/:commentId/like', CommentController.toggleCommentLike);

// Get likes for a comment
commentRouter.get('/comments/:commentId/likes', CommentController.getCommentLikes);

// Check if user liked a comment
commentRouter.get('/comments/:commentId/likes/me', CommentController.checkUserCommentLike);
