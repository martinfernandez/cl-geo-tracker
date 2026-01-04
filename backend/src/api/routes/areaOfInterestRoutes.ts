import { Router } from 'express';
import { AreaOfInterestController } from '../controllers/areaOfInterestController';
import { AreaInvitationController } from '../controllers/areaInvitationController';
import { authMiddleware } from '../../middleware/auth';

export const areaOfInterestRouter = Router();

// Area CRUD
areaOfInterestRouter.post('/', authMiddleware, AreaOfInterestController.create);
areaOfInterestRouter.get('/my-areas', authMiddleware, AreaOfInterestController.getMyAreas);
areaOfInterestRouter.get('/search', authMiddleware, AreaOfInterestController.search);
areaOfInterestRouter.get('/nearby', authMiddleware, AreaOfInterestController.getNearbyAreas);
areaOfInterestRouter.get('/:id', authMiddleware, AreaOfInterestController.getById);
areaOfInterestRouter.put('/:id', authMiddleware, AreaOfInterestController.update);
areaOfInterestRouter.delete('/:id', authMiddleware, AreaOfInterestController.delete);

// Membership management
areaOfInterestRouter.post('/:id/join', authMiddleware, AreaOfInterestController.join);
areaOfInterestRouter.post('/:id/leave', authMiddleware, AreaOfInterestController.leave);
areaOfInterestRouter.get('/:id/membership', authMiddleware, AreaOfInterestController.getMembership);
areaOfInterestRouter.put('/:id/notifications', authMiddleware, AreaOfInterestController.toggleNotifications);
areaOfInterestRouter.post('/:id/seen', authMiddleware, AreaOfInterestController.markAreaAsSeen);
areaOfInterestRouter.delete(
  '/:id/members/:memberId',
  authMiddleware,
  AreaOfInterestController.removeMember
);
areaOfInterestRouter.put(
  '/:id/members/:memberId/role',
  authMiddleware,
  AreaOfInterestController.updateMemberRole
);

// Invitations and join requests
areaOfInterestRouter.post('/invitations/send', authMiddleware, AreaInvitationController.sendInvitation);
areaOfInterestRouter.post('/invitations/request-join', authMiddleware, AreaInvitationController.requestJoin);
areaOfInterestRouter.get('/invitations/my-invitations', authMiddleware, AreaInvitationController.getMyInvitations);
areaOfInterestRouter.get('/:areaId/invitations/requests', authMiddleware, AreaInvitationController.getAreaRequests);
areaOfInterestRouter.post('/invitations/:id/accept', authMiddleware, AreaInvitationController.accept);
areaOfInterestRouter.post('/invitations/:id/reject', authMiddleware, AreaInvitationController.reject);
