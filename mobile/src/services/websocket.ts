import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_URL, ENV } from '../config/environment';
import { submitLocationOnDemand } from './backgroundLocation';

type EventCallback = (data: any) => void;

interface WebSocketMessage {
  type: string;
  payload?: any;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Connect to WebSocket server with authentication
   */
  async connect(userId: string): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.userId = userId;
    this.shouldReconnect = true;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log(`[WebSocket] Connecting to ${ENV}: ${WS_URL}`);
      this.ws = new WebSocket(`${WS_URL}?token=${token}&userId=${userId}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startPing();
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error: any) => {
        console.error('WebSocket error:', error?.message || 'Unknown error');
        this.isConnecting = false;
        // Don't emit error to avoid crashes, just log it
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.stopPing();
        this.emit('disconnected', { code: event.code, reason: event.reason });

        // Attempt to reconnect if not manually closed
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => {
            if (this.userId) {
              this.connect(this.userId);
            }
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.userId = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Send a message through WebSocket
   */
  private send(type: string, payload?: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    const message: WebSocketMessage = { type, payload };
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    console.log('Joining conversation:', conversationId);
    this.send('join_conversation', { conversationId });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    console.log('Leaving conversation:', conversationId);
    this.send('leave_conversation', { conversationId });
  }

  /**
   * Send typing start indicator
   */
  sendTypingStart(conversationId: string): void {
    this.send('typing_start', { conversationId });
  }

  /**
   * Send typing stop indicator
   */
  sendTypingStop(conversationId: string): void {
    this.send('typing_stop', { conversationId });
  }

  /**
   * Register an event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unregister an event listener
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any): void {
    const { type, ...rest } = message;
    // Backend sends data directly in message, not in payload
    const data = rest.payload || rest;

    switch (type) {
      case 'pong':
        // Keep-alive response
        break;

      case 'connected':
      case 'authenticated':
      case 'conversation_joined':
      case 'conversation_left':
        // Connection/room events - just log
        console.log(`[WS] ${type}`);
        break;

      case 'message_sent':
        // New message received (in conversation room)
        console.log('[WS] message_sent received:', data);
        this.emit('message_sent', data);
        break;

      case 'new_message':
        // New message notification (direct to user)
        console.log('[WS] new_message received:', data);
        this.emit('new_message', data);
        this.emit('message_sent', data); // Also emit as message_sent for compatibility
        break;

      case 'typing_start':
        // User started typing
        this.emit('typing_start', data);
        break;

      case 'typing_stop':
        // User stopped typing
        this.emit('typing_stop', data);
        break;

      case 'conversation_updated':
        // Conversation metadata updated
        this.emit('conversation_updated', data);
        break;

      case 'area_event':
        // New event in user's area of interest
        console.log('[WS] area_event received:', data);
        this.emit('area_event', data);
        break;

      case 'position_update':
        // GPS device position update
        console.log('[WS] position_update received:', data);
        this.emit('position_update', data);
        break;

      case 'request_location':
        // Server is requesting current location (someone is viewing the map)
        console.log('[WS] request_location received');
        submitLocationOnDemand().catch((err) => {
          console.error('[WS] Error submitting on-demand location:', err);
        });
        break;

      case 'error':
        // Server error
        console.error('WebSocket server error:', data);
        this.emit('error', data);
        break;

      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
