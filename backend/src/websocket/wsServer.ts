import { Server as WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer, IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import url from 'url';
import { initRedis, publish, subscribe, isRedisEnabled } from '../services/redisPubSub';

let wss: WebSocketServer;

// Redis channels for cross-instance communication
const REDIS_CHANNELS = {
  POSITION_UPDATE: 'ws:position_update',
  NEW_MESSAGE: 'ws:new_message',
  USER_MESSAGE: 'ws:user_message',
  GROUP_POSITION: 'ws:group_position',
  REQUEST_LOCATION: 'ws:request_location',
};

interface ConnectedClient {
  ws: WebSocket;
  userId: string | null;
  conversationIds: Set<string>;
  groupIds: Set<string>;
}

// Map to store connected clients
const clients = new Map<WebSocket, ConnectedClient>();

// Map to store user connections (userId -> Set of WebSockets)
const userConnections = new Map<string, Set<WebSocket>>();

// Map to store conversation rooms (conversationId -> Set of WebSockets)
const conversationRooms = new Map<string, Set<WebSocket>>();

// Map to store group rooms (groupId -> Set of WebSockets)
const groupRooms = new Map<string, Set<WebSocket>>();

export function startWebSocketServer(httpServer: HttpServer) {
  // Initialize Redis for cross-instance communication
  const redisEnabled = initRedis();

  if (redisEnabled) {
    // Subscribe to Redis channels for cross-instance messages
    subscribe(REDIS_CHANNELS.POSITION_UPDATE, (_, data) => {
      localBroadcastPositionUpdate(data);
    });

    subscribe(REDIS_CHANNELS.NEW_MESSAGE, (_, data) => {
      localBroadcastNewMessage(data.conversationId, data.message);
    });

    subscribe(REDIS_CHANNELS.USER_MESSAGE, (_, data) => {
      localSendToUser(data.userId, data.data);
    });

    subscribe(REDIS_CHANNELS.GROUP_POSITION, (_, data) => {
      localBroadcastGroupPosition(data.groupId, data.data);
    });

    subscribe(REDIS_CHANNELS.REQUEST_LOCATION, (_, data) => {
      localRequestLocationFromUsers(data.userIds, data.requesterId);
    });
  }

  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req: IncomingMessage) => {
    console.log('WebSocket client connected');

    // Parse query parameters for authentication
    const parsedUrl = url.parse(req.url || '', true);
    const token = parsedUrl.query.token as string;
    const userId = parsedUrl.query.userId as string;

    let authenticatedUserId: string | null = null;

    // Verify token if provided
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production') as any;
        authenticatedUserId = decoded.userId || userId;
        console.log(`WebSocket client authenticated as user ${authenticatedUserId}`);
      } catch (error) {
        console.error('WebSocket token verification failed:', error);
      }
    }

    // Initialize client data
    clients.set(ws, {
      ws,
      userId: authenticatedUserId,
      conversationIds: new Set(),
      groupIds: new Set(),
    });

    // Add to user connections map
    if (authenticatedUserId) {
      if (!userConnections.has(authenticatedUserId)) {
        userConnections.set(authenticatedUserId, new Set());
      }
      userConnections.get(authenticatedUserId)!.add(ws);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleWebSocketMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      handleClientDisconnect(ws);
    });

    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }));
  });

  console.log('WebSocket server started on /ws');
  return wss;
}

function handleWebSocketMessage(ws: WebSocket, data: any) {
  const { type } = data;

  switch (type) {
    case 'ping':
      // Respond to ping with pong
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
    case 'authenticate':
      handleAuthenticate(ws, data);
      break;
    case 'join_conversation':
      handleJoinConversation(ws, data);
      break;
    case 'leave_conversation':
      handleLeaveConversation(ws, data);
      break;
    case 'typing_start':
      handleTypingStart(ws, data);
      break;
    case 'typing_stop':
      handleTypingStop(ws, data);
      break;
    case 'join_group':
      handleJoinGroup(ws, data);
      break;
    case 'leave_group':
      handleLeaveGroup(ws, data);
      break;
    default:
      console.log('Unknown message type:', type);
  }
}

function handleAuthenticate(ws: WebSocket, data: any) {
  const { userId } = data;
  const client = clients.get(ws);

  if (client && userId) {
    client.userId = userId;
    console.log(`Client authenticated as user ${userId}`);

    ws.send(JSON.stringify({
      type: 'authenticated',
      userId,
      timestamp: new Date().toISOString(),
    }));
  }
}

function handleJoinConversation(ws: WebSocket, data: any) {
  const { conversationId } = data;
  const client = clients.get(ws);

  if (!client) return;

  // Add to conversation room
  if (!conversationRooms.has(conversationId)) {
    conversationRooms.set(conversationId, new Set());
  }

  conversationRooms.get(conversationId)!.add(ws);
  client.conversationIds.add(conversationId);

  console.log(`Client joined conversation ${conversationId}`);

  ws.send(JSON.stringify({
    type: 'conversation_joined',
    conversationId,
    timestamp: new Date().toISOString(),
  }));
}

function handleLeaveConversation(ws: WebSocket, data: any) {
  const { conversationId } = data;
  const client = clients.get(ws);

  if (!client) return;

  // Remove from conversation room
  const room = conversationRooms.get(conversationId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      conversationRooms.delete(conversationId);
    }
  }

  client.conversationIds.delete(conversationId);

  console.log(`Client left conversation ${conversationId}`);

  ws.send(JSON.stringify({
    type: 'conversation_left',
    conversationId,
    timestamp: new Date().toISOString(),
  }));
}

function handleTypingStart(ws: WebSocket, data: any) {
  const { conversationId } = data;
  const client = clients.get(ws);

  if (!client || !client.userId) return;

  broadcastToConversation(conversationId, {
    type: 'typing_start',
    conversationId,
    userId: client.userId,
    timestamp: new Date().toISOString(),
  }, ws);
}

function handleTypingStop(ws: WebSocket, data: any) {
  const { conversationId } = data;
  const client = clients.get(ws);

  if (!client || !client.userId) return;

  broadcastToConversation(conversationId, {
    type: 'typing_stop',
    conversationId,
    userId: client.userId,
    timestamp: new Date().toISOString(),
  }, ws);
}

function handleJoinGroup(ws: WebSocket, data: any) {
  const { groupId } = data;
  const client = clients.get(ws);

  if (!client) return;

  // Add to group room
  if (!groupRooms.has(groupId)) {
    groupRooms.set(groupId, new Set());
  }

  groupRooms.get(groupId)!.add(ws);
  client.groupIds.add(groupId);

  console.log(`Client joined group ${groupId}`);

  ws.send(JSON.stringify({
    type: 'group_joined',
    groupId,
    timestamp: new Date().toISOString(),
  }));
}

function handleLeaveGroup(ws: WebSocket, data: any) {
  const { groupId } = data;
  const client = clients.get(ws);

  if (!client) return;

  // Remove from group room
  const room = groupRooms.get(groupId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      groupRooms.delete(groupId);
    }
  }

  client.groupIds.delete(groupId);

  console.log(`Client left group ${groupId}`);

  ws.send(JSON.stringify({
    type: 'group_left',
    groupId,
    timestamp: new Date().toISOString(),
  }));
}

function handleClientDisconnect(ws: WebSocket) {
  const client = clients.get(ws);

  if (client) {
    // Remove from all conversation rooms
    client.conversationIds.forEach((conversationId) => {
      const room = conversationRooms.get(conversationId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          conversationRooms.delete(conversationId);
        }
      }
    });

    // Remove from all group rooms
    client.groupIds.forEach((groupId) => {
      const room = groupRooms.get(groupId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          groupRooms.delete(groupId);
        }
      }
    });

    // Remove from user connections
    if (client.userId) {
      const userSockets = userConnections.get(client.userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          userConnections.delete(client.userId);
        }
      }
    }

    clients.delete(ws);
    console.log(`Client disconnected (userId: ${client.userId})`);
  }
}

// Broadcast message to all clients in a conversation except sender
function broadcastToConversation(
  conversationId: string,
  message: any,
  excludeWs?: WebSocket
) {
  const room = conversationRooms.get(conversationId);

  if (!room) {
    console.log(`No room found for conversation ${conversationId}`);
    return;
  }

  const messageStr = JSON.stringify(message);

  room.forEach((clientWs) => {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(messageStr);
    }
  });
}

// Local broadcast for this instance only (called by Redis subscriber)
function localBroadcastNewMessage(conversationId: string, message: any) {
  broadcastToConversation(conversationId, {
    type: 'message_sent',
    conversationId,
    message,
    timestamp: new Date().toISOString(),
  });

  if (message.receiverId) {
    localSendToUser(message.receiverId, {
      type: 'new_message',
      conversationId,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Broadcast new message to conversation participants (with Redis support)
export function broadcastNewMessage(conversationId: string, message: any) {
  console.log(`[WS] Broadcasting message to conversation ${conversationId}`);

  if (isRedisEnabled()) {
    // Publish to Redis for all instances
    publish(REDIS_CHANNELS.NEW_MESSAGE, { conversationId, message });
  } else {
    // Single instance mode
    localBroadcastNewMessage(conversationId, message);
  }
}

// Local send to user on this instance only
function localSendToUser(userId: string, data: any) {
  const userSockets = userConnections.get(userId);

  if (!userSockets || userSockets.size === 0) {
    return;
  }

  const messageStr = JSON.stringify(data);
  userSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

// Send message to a specific user (with Redis support)
export function sendToUser(userId: string, data: any) {
  console.log(`[WS] Sending to user ${userId}`);

  if (isRedisEnabled()) {
    publish(REDIS_CHANNELS.USER_MESSAGE, { userId, data });
  } else {
    localSendToUser(userId, data);
  }
}

// Local broadcast position update
function localBroadcastPositionUpdate(data: any) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'position_update',
    data,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast position updates (with Redis support)
export function broadcastPositionUpdate(data: any) {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }

  if (isRedisEnabled()) {
    publish(REDIS_CHANNELS.POSITION_UPDATE, data);
  } else {
    localBroadcastPositionUpdate(data);
  }
}

// Local broadcast to group
function localBroadcastGroupPosition(groupId: string, data: any) {
  const room = groupRooms.get(groupId);

  if (!room || room.size === 0) return;

  const message = JSON.stringify({
    type: 'group_position_update',
    groupId,
    data,
    timestamp: new Date().toISOString(),
  });

  room.forEach((clientWs) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  });
}

// Broadcast position update to a specific group (with Redis support)
export function broadcastGroupPositionUpdate(groupId: string, data: any) {
  console.log(`[WS] Broadcast position to group ${groupId}`);

  if (isRedisEnabled()) {
    publish(REDIS_CHANNELS.GROUP_POSITION, { groupId, data });
  } else {
    localBroadcastGroupPosition(groupId, data);
  }
}

// Local request location from users on this instance
function localRequestLocationFromUsers(userIds: string[], requesterId?: string) {
  const message = JSON.stringify({
    type: 'request_location',
    requesterId,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;
  userIds.forEach((userId) => {
    // Don't request from the requester themselves
    if (userId === requesterId) return;

    const userSockets = userConnections.get(userId);
    if (userSockets) {
      userSockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        }
      });
    }
  });

  if (sentCount > 0) {
    console.log(`[WS] Requested location from ${sentCount} connected users`);
  }
}

// Request location from specific users (with Redis support)
// Called when someone views the map to get fresh positions
export function requestLocationFromUsers(userIds: string[], requesterId?: string) {
  console.log(`[WS] Requesting location from ${userIds.length} users`);

  if (isRedisEnabled()) {
    publish(REDIS_CHANNELS.REQUEST_LOCATION, { userIds, requesterId });
  } else {
    localRequestLocationFromUsers(userIds, requesterId);
  }
}
