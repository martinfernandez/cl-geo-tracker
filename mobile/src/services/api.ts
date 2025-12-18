import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://192.168.0.69:3000/api'
  : 'https://cl-geo-tracker-production.up.railway.app/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const deviceApi = {
  getAll: async () => {
    const response = await api.get('/devices');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/devices/${id}`);
    return response.data;
  },
  create: async (imei: string, name?: string) => {
    const response = await api.post('/devices', { imei, name });
    return response.data;
  },
  update: async (id: string, name: string) => {
    const response = await api.put(`/devices/${id}`, { name });
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/devices/${id}`);
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
    deviceId: string;
    type: string;
    description: string;
    latitude: number;
    longitude: number;
    imageUrl?: string;
    isUrgent?: boolean;
    realTimeTracking?: boolean;
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
  type: 'EVENT_REACTION' | 'EVENT_COMMENT' | 'COMMENT_REPLY';
  senderId?: string;
  receiverId: string;
  eventId?: string;
  commentId?: string;
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
