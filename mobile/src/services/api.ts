import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, ENV } from '../config/environment';

console.log(`[API] Environment: ${ENV}, URL: ${API_URL}`);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public API instance - no auth token
export const publicApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests (only for authenticated api)
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Import authService lazily to avoid circular dependency
let authServiceModule: any = null;
const getAuthService = async () => {
  if (!authServiceModule) {
    authServiceModule = (await import('./authService')).default;
  }
  return authServiceModule;
};

// Auto-logout on 401 (invalid/expired token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('[API] 401 Unauthorized - forcing logout');
      const authService = await getAuthService();
      await authService.forceLogout();
    }
    return Promise.reject(error);
  }
);

export type DeviceType = 'GPS_TRACKER' | 'TAGGED_OBJECT';

export interface Device {
  id: string;
  type: DeviceType;
  imei: string | null;
  name: string | null;
  color: string | null;
  userId: string | null;
  qrCode: string;
  qrEnabled: boolean;
  isLocked: boolean;
  lockLatitude: number | null;
  lockLongitude: number | null;
  lockRadius: number;
  lockedAt: string | null;
  lastAlertAt: string | null;
  createdAt: string;
  updatedAt: string;
  positions?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
  }>;
}

export interface DeviceQRInfo {
  id: string;
  name: string | null;
  type: DeviceType;
  qrCode: string;
  qrEnabled: boolean;
}

export const deviceApi = {
  getAll: async (): Promise<Device[]> => {
    const response = await api.get('/devices');
    return response.data;
  },
  getById: async (id: string): Promise<Device> => {
    const response = await api.get(`/devices/${id}`);
    return response.data;
  },
  create: async (imei: string, name?: string, color?: string): Promise<Device> => {
    const response = await api.post('/devices', { imei, name, color, type: 'GPS_TRACKER' });
    return response.data;
  },
  createTaggedObject: async (name: string, color?: string): Promise<Device> => {
    const response = await api.post('/devices', { name, color, type: 'TAGGED_OBJECT' });
    return response.data;
  },
  update: async (id: string, data: { name?: string; color?: string }): Promise<Device> => {
    const response = await api.put(`/devices/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/devices/${id}`);
  },
  // Lock/Unlock endpoints
  lock: async (id: string, radius: number = 0): Promise<Device> => {
    const response = await api.post(`/devices/${id}/lock`, { radius });
    return response.data;
  },
  unlock: async (id: string): Promise<Device> => {
    const response = await api.post(`/devices/${id}/unlock`);
    return response.data;
  },
  updateLockRadius: async (id: string, radius: number): Promise<Device> => {
    const response = await api.patch(`/devices/${id}/lock-radius`, { radius });
    return response.data;
  },
  // QR Code endpoints
  getQR: async (id: string): Promise<DeviceQRInfo> => {
    const response = await api.get(`/devices/${id}/qr`);
    return response.data;
  },
  toggleQR: async (id: string, enabled: boolean): Promise<DeviceQRInfo> => {
    const response = await api.put(`/devices/${id}/qr`, { enabled });
    return response.data;
  },
  regenerateQR: async (id: string): Promise<DeviceQRInfo> => {
    const response = await api.post(`/devices/${id}/qr/regenerate`);
    return response.data;
  },
};

export const positionApi = {
  getByDeviceId: async (deviceId: string) => {
    const response = await api.get(`/positions/device/${deviceId}`);
    return response.data;
  },
};

export interface Event {
  id: string;
  deviceId: string;
  userId: string;
  groupId?: string;
  type: 'THEFT' | 'LOST' | 'ACCIDENT' | 'FIRE';
  description: string;
  latitude: number;
  longitude: number;
  status: 'IN_PROGRESS' | 'CLOSED';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  device: any;
  user: { id: string; name: string; email: string };
  group?: { id: string; name: string };
  creatorName?: string;
}

export const eventApi = {
  getAll: async () => {
    const response = await api.get('/events');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },
  getPublicById: async (id: string) => {
    const response = await api.get(`/events/public/${id}`);
    return response.data;
  },
  getPublicByRegion: async (params: {
    northEast: string;
    southWest: string;
    status?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const response = await api.get('/events/public/region', { params });
    return response.data;
  },
  create: async (data: {
    deviceId?: string;
    type: string;
    description: string;
    latitude: number;
    longitude: number;
    imageUrl?: string;
    isUrgent?: boolean;
    realTimeTracking?: boolean;
    groupId?: string;
  }) => {
    const response = await api.post('/events', data);
    return response.data;
  },
  update: async (
    id: string,
    data: { status?: string; description?: string; imageUrl?: string; isUrgent?: boolean }
  ) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/events/${id}`);
  },
  getEventPositions: async (eventId: string) => {
    const response = await api.get(`/events/${eventId}/positions`);
    return response.data;
  },
  uploadImage: async (uri: string) => {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'event-image.jpg',
    } as any);

    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.imageUrl;
  },
};

export const reactionApi = {
  toggleReaction: async (eventId: string) => {
    const response = await api.post(`/events/${eventId}/reactions`);
    return response.data;
  },
  getEventReactions: async (eventId: string) => {
    const response = await api.get(`/events/${eventId}/reactions`);
    return response.data;
  },
  checkUserReaction: async (eventId: string) => {
    const response = await api.get(`/events/${eventId}/reactions/me`);
    return response.data;
  },
};

export interface Comment {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  replies?: Comment[];
  likes?: Array<{
    id: string;
    userId: string;
    createdAt: string;
  }>;
}

export const commentApi = {
  createComment: async (
    eventId: string,
    data: { content: string; parentCommentId?: string }
  ) => {
    const response = await api.post(`/events/${eventId}/comments`, data);
    return response.data;
  },
  getEventComments: async (eventId: string) => {
    const response = await api.get(`/events/${eventId}/comments`);
    return response.data;
  },
  getCommentCount: async (eventId: string) => {
    const response = await api.get(`/events/${eventId}/comments/count`);
    return response.data;
  },
  deleteComment: async (commentId: string) => {
    await api.delete(`/comments/${commentId}`);
  },
  toggleCommentLike: async (commentId: string) => {
    const response = await api.post(`/comments/${commentId}/like`);
    return response.data;
  },
  getCommentLikes: async (commentId: string) => {
    const response = await api.get(`/comments/${commentId}/likes`);
    return response.data;
  },
  checkUserCommentLike: async (commentId: string) => {
    const response = await api.get(`/comments/${commentId}/likes/me`);
    return response.data;
  },
};

export interface Notification {
  id: string;
  type: 'EVENT_REACTION' | 'EVENT_COMMENT' | 'COMMENT_REPLY' | 'AREA_JOIN_REQUEST' | 'AREA_JOIN_ACCEPTED' | 'AREA_INVITATION' | 'FOUND_OBJECT' | 'FOUND_OBJECT_MESSAGE';
  senderId?: string;
  receiverId: string;
  eventId?: string;
  commentId?: string;
  areaId?: string;
  chatId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; name: string; email: string };
}

export const notificationApi = {
  getUserNotifications: async (unreadOnly?: boolean) => {
    const response = await api.get('/notifications', {
      params: unreadOnly ? { unreadOnly: 'true' } : {},
    });
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread/count');
    return response.data;
  },
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read/all');
    return response.data;
  },
  deleteNotification: async (notificationId: string) => {
    await api.delete(`/notifications/${notificationId}`);
  },
};

// Areas of Interest
export interface AreaOfInterest {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  radius: number;
  visibility: 'PUBLIC' | 'PRIVATE_SHAREABLE' | 'PRIVATE';
  creatorId: string;
  creator: { id: string; name: string; email: string };
  memberCount: number;
  userRole?: 'ADMIN' | 'MEMBER';
  isMember: boolean;
  hasPendingRequest?: boolean;
  pendingRequestsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AreaMember {
  id: string;
  userId: string;
  areaId: string;
  role: 'ADMIN' | 'MEMBER';
  user: { id: string; name: string; email: string };
  createdAt: string;
}

export interface AreaInvitation {
  id: string;
  areaId: string;
  senderId?: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  type: 'INVITATION' | 'JOIN_REQUEST';
  area: { id: string; name: string; description?: string };
  sender?: { id: string; name: string; email: string };
  receiver?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const areaApi = {
  // Area CRUD
  create: async (data: {
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    radius: number;
    visibility?: 'PUBLIC' | 'PRIVATE_SHAREABLE' | 'PRIVATE';
  }) => {
    const response = await api.post('/areas', data);
    return response.data;
  },
  getMyAreas: async () => {
    const response = await api.get('/areas/my-areas');
    return response.data;
  },
  search: async (params: { query?: string; visibility?: string }) => {
    const response = await api.get('/areas/search', { params });
    return response.data;
  },
  getNearby: async (params: { latitude: number; longitude: number; radiusKm?: number }) => {
    const response = await api.get('/areas/nearby', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/areas/${id}`);
    return response.data;
  },
  update: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      latitude?: number;
      longitude?: number;
      radius?: number;
      visibility?: 'PUBLIC' | 'PRIVATE_SHAREABLE' | 'PRIVATE';
    }
  ) => {
    const response = await api.put(`/areas/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/areas/${id}`);
  },

  // Membership
  join: async (areaId: string) => {
    const response = await api.post(`/areas/${areaId}/join`);
    return response.data;
  },
  leave: async (areaId: string) => {
    await api.post(`/areas/${areaId}/leave`);
  },
  removeMember: async (areaId: string, memberId: string) => {
    await api.delete(`/areas/${areaId}/members/${memberId}`);
  },
  updateMemberRole: async (areaId: string, memberId: string, role: 'ADMIN' | 'MEMBER') => {
    const response = await api.put(`/areas/${areaId}/members/${memberId}/role`, { role });
    return response.data;
  },

  // Invitations
  sendInvitation: async (areaId: string, receiverId: string) => {
    const response = await api.post('/areas/invitations/send', { areaId, receiverId });
    return response.data;
  },
  requestJoin: async (areaId: string) => {
    const response = await api.post('/areas/invitations/request-join', { areaId });
    return response.data;
  },
  getMyInvitations: async () => {
    const response = await api.get('/areas/invitations/my-invitations');
    return response.data;
  },
  getAreaRequests: async (areaId: string) => {
    const response = await api.get(`/areas/${areaId}/invitations/requests`);
    return response.data;
  },
  acceptInvitation: async (invitationId: string) => {
    await api.post(`/areas/invitations/${invitationId}/accept`);
  },
  rejectInvitation: async (invitationId: string) => {
    await api.post(`/areas/invitations/${invitationId}/reject`);
  },
};

// User Groups
export interface Group {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  creator: { id: string; name: string; email: string };
  memberCount: number;
  userRole?: 'ADMIN' | 'MEMBER';
  locationSharingEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: 'ADMIN' | 'MEMBER';
  locationSharingEnabled: boolean;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  senderId: string;
  receiverId?: string;
  email?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  group: { id: string; name: string; description?: string };
  sender?: { id: string; name: string; email: string };
  createdAt: string;
}

export const groupApi = {
  create: async (data: { name: string; description?: string }) => {
    const response = await api.post('/groups', data);
    return response.data;
  },
  getMyGroups: async (): Promise<Group[]> => {
    const response = await api.get('/groups/my-groups');
    return response.data;
  },
  getMyAdminGroups: async (): Promise<{ id: string; name: string; description?: string }[]> => {
    const response = await api.get('/groups/admin-groups');
    return response.data;
  },
  getOrCreateGroupChat: async (groupId: string) => {
    const response = await api.post(`/groups/${groupId}/chat`);
    return response.data;
  },
  getById: async (id: string): Promise<Group & { members: GroupMember[] }> => {
    const response = await api.get(`/groups/${id}`);
    return response.data;
  },
  update: async (id: string, data: { name?: string; description?: string }) => {
    const response = await api.put(`/groups/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/groups/${id}`);
  },
  leave: async (id: string) => {
    await api.post(`/groups/${id}/leave`);
  },
  removeMember: async (groupId: string, memberId: string) => {
    await api.delete(`/groups/${groupId}/members/${memberId}`);
  },
  updateMemberRole: async (groupId: string, memberId: string, role: 'ADMIN' | 'MEMBER') => {
    const response = await api.put(`/groups/${groupId}/members/${memberId}/role`, { role });
    return response.data;
  },
  toggleLocationSharing: async (groupId: string, enabled: boolean) => {
    const response = await api.put(`/groups/${groupId}/location-sharing`, { enabled });
    return response.data;
  },
  getDevices: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}/devices`);
    return response.data;
  },
  getEvents: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}/events`);
    return response.data;
  },
  getPositions: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}/positions`);
    return response.data;
  },
  // Invitations
  sendInvitation: async (groupId: string, receiverId: string) => {
    const response = await api.post('/groups/invitations/send', { groupId, receiverId });
    return response.data;
  },
  sendEmailInvitation: async (groupId: string, email: string) => {
    const response = await api.post('/groups/invitations/send-email', { groupId, email });
    return response.data;
  },
  getMyInvitations: async (): Promise<GroupInvitation[]> => {
    const response = await api.get('/groups/invitations/my-invitations');
    return response.data;
  },
  searchUsers: async (groupId: string, query: string) => {
    const response = await api.get('/groups/invitations/search-users', {
      params: { groupId, query },
    });
    return response.data;
  },
  acceptInvitation: async (invitationId: string) => {
    const response = await api.post(`/groups/invitations/${invitationId}/accept`);
    return response.data;
  },
  rejectInvitation: async (invitationId: string) => {
    await api.post(`/groups/invitations/${invitationId}/reject`);
  },
};

// Phone Location
export const phoneLocationApi = {
  createDevice: async (name?: string) => {
    const response = await api.post('/phone-device', { name });
    return response.data;
  },
  getMyDevice: async () => {
    const response = await api.get('/phone-device/my-device');
    return response.data;
  },
  submitPosition: async (position: {
    latitude: number;
    longitude: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    timestamp?: string;
  }) => {
    const response = await api.post('/phone-device/position', position);
    return response.data;
  },
  submitBatchPositions: async (
    positions: Array<{
      latitude: number;
      longitude: number;
      altitude?: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      timestamp?: string;
    }>
  ) => {
    const response = await api.post('/phone-device/positions/batch', { positions });
    return response.data;
  },
  toggle: async (enabled: boolean) => {
    const response = await api.put('/phone-device/toggle', { enabled });
    return response.data;
  },
  getStatus: async () => {
    const response = await api.get('/phone-device/status');
    return response.data;
  },
  updateDevice: async (name: string) => {
    const response = await api.put('/phone-device/update', { name });
    return response.data;
  },
  getHistory: async (limit?: number, from?: string, to?: string) => {
    const response = await api.get('/phone-device/history', {
      params: { limit, from, to },
    });
    return response.data;
  },
};

// Found Object Chats (QR Tags)
export type FoundChatStatus = 'ACTIVE' | 'RESOLVED' | 'CLOSED';

export interface FoundObjectChat {
  id: string;
  deviceId: string;
  device?: {
    id: string;
    name: string | null;
    type: DeviceType;
  };
  finderName: string | null;
  status: FoundChatStatus;
  lastMessage?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FoundObjectMessage {
  id: string;
  isOwner: boolean;
  content: string;
  createdAt: string;
}

export interface FoundChatDetail {
  id: string;
  deviceId: string;
  device?: {
    id: string;
    name: string | null;
    type: DeviceType;
  };
  finderName: string | null;
  status: FoundChatStatus;
  messages: FoundObjectMessage[];
  createdAt: string;
  updatedAt: string;
}

export const foundChatsApi = {
  // As device owner - get all chats where user owns the device
  getOwnerChats: async (status?: FoundChatStatus): Promise<FoundObjectChat[]> => {
    const response = await api.get('/qr/found-chats', { params: { status } });
    return response.data;
  },
  getChat: async (chatId: string): Promise<FoundChatDetail> => {
    const response = await api.get(`/qr/found-chats/${chatId}`);
    return response.data;
  },
  sendOwnerMessage: async (chatId: string, content: string): Promise<FoundObjectMessage> => {
    const response = await api.post(`/qr/found-chats/${chatId}/message`, { content });
    return response.data;
  },
  updateStatus: async (chatId: string, status: 'RESOLVED' | 'CLOSED'): Promise<FoundChatDetail> => {
    const response = await api.put(`/qr/found-chats/${chatId}/status`, { status });
    return response.data;
  },

  // Contact owner - works for both anonymous and registered users (no auth required)
  contactOwner: async (qrCode: string, message?: string, finderName?: string) => {
    // Use public API instance (no auth token)
    const response = await publicApi.post(`/qr/public/${qrCode}/chat`, { message, finderName });
    return response.data;
  },

  // As registered finder - start chat (requires auth)
  contactOwnerAsUser: async (qrCode: string, message?: string) => {
    const response = await api.post(`/qr/contact/${qrCode}`, { message });
    return response.data;
  },
  getFinderChats: async (): Promise<FoundObjectChat[]> => {
    const response = await api.get('/qr/my-finds');
    return response.data;
  },
  sendFinderMessage: async (chatId: string, content: string): Promise<FoundObjectMessage> => {
    const response = await api.post(`/qr/my-finds/${chatId}/message`, { content });
    return response.data;
  },
};
