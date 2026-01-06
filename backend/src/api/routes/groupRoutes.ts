import { Router } from 'express';
import { GroupController } from '../controllers/groupController';
import { GroupInvitationController } from '../controllers/groupInvitationController';
import { PhoneLocationController } from '../controllers/phoneLocationController';
import { UploadController } from '../controllers/uploadController';
import { authMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

export const groupRouter = Router();

// All routes require authentication
groupRouter.use(authMiddleware);

// Group CRUD
groupRouter.post('/', GroupController.create);
groupRouter.get('/my-groups', GroupController.getMyGroups);
groupRouter.get('/admin-groups', GroupController.getMyAdminGroups);
groupRouter.get('/:id', GroupController.getById);
groupRouter.put('/:id', GroupController.update);
groupRouter.delete('/:id', GroupController.delete);

// Group image upload
groupRouter.put('/:groupId/image', upload.single('image'), UploadController.uploadGroupImage);

// Group membership
groupRouter.post('/:id/leave', GroupController.leave);
groupRouter.delete('/:id/members/:memberId', GroupController.removeMember);
groupRouter.put('/:id/members/:memberId/role', GroupController.updateMemberRole);
groupRouter.put('/:id/location-sharing', GroupController.toggleLocationSharing);

// Group data (devices, events, positions)
groupRouter.get('/:id/devices', GroupController.getDevices);
groupRouter.get('/:id/events', GroupController.getEvents);
groupRouter.get('/:id/positions', GroupController.getPositions);

// Group chat
groupRouter.post('/:id/chat', GroupController.getOrCreateGroupChat);

// Invitations
groupRouter.post('/invitations/send', GroupInvitationController.sendInvitation);
groupRouter.post('/invitations/send-email', GroupInvitationController.sendEmailInvitation);
groupRouter.get('/invitations/my-invitations', GroupInvitationController.getMyInvitations);
groupRouter.get('/invitations/search-users', GroupInvitationController.searchUsers);
groupRouter.post('/invitations/:id/accept', GroupInvitationController.accept);
groupRouter.post('/invitations/:id/reject', GroupInvitationController.reject);

// Phone location routes
export const phoneLocationRouter = Router();

phoneLocationRouter.use(authMiddleware);

phoneLocationRouter.post('/', PhoneLocationController.createDevice);
phoneLocationRouter.get('/my-device', PhoneLocationController.getMyDevice);
phoneLocationRouter.post('/position', PhoneLocationController.submitPosition);
phoneLocationRouter.post('/positions/batch', PhoneLocationController.submitBatchPositions);
phoneLocationRouter.put('/toggle', PhoneLocationController.toggle);
phoneLocationRouter.get('/status', PhoneLocationController.getStatus);
phoneLocationRouter.put('/update', PhoneLocationController.updateDevice);
phoneLocationRouter.get('/history', PhoneLocationController.getPositionHistory);
