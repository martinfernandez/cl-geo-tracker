import Redis from 'ioredis';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

type MessageHandler = (channel: string, message: any) => void;
const handlers: Map<string, Set<MessageHandler>> = new Map();

export function initRedis(): boolean {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log('[Redis] No REDIS_URL configured, running in single-instance mode');
    return false;
  }

  try {
    publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    publisher.on('connect', () => {
      console.log('[Redis] Publisher connected');
    });

    subscriber.on('connect', () => {
      console.log('[Redis] Subscriber connected');
    });

    publisher.on('error', (err) => {
      console.error('[Redis] Publisher error:', err.message);
    });

    subscriber.on('error', (err) => {
      console.error('[Redis] Subscriber error:', err.message);
    });

    subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        const channelHandlers = handlers.get(channel);
        if (channelHandlers) {
          channelHandlers.forEach((handler) => handler(channel, data));
        }
      } catch (error) {
        console.error('[Redis] Error parsing message:', error);
      }
    });

    console.log('[Redis] Initialized for scalable WebSocket');
    return true;
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    return false;
  }
}

export function publish(channel: string, data: any): void {
  if (publisher) {
    publisher.publish(channel, JSON.stringify(data));
  }
}

export function subscribe(channel: string, handler: MessageHandler): void {
  if (!handlers.has(channel)) {
    handlers.set(channel, new Set());
    if (subscriber) {
      subscriber.subscribe(channel);
    }
  }
  handlers.get(channel)!.add(handler);
}

export function unsubscribe(channel: string, handler: MessageHandler): void {
  const channelHandlers = handlers.get(channel);
  if (channelHandlers) {
    channelHandlers.delete(handler);
    if (channelHandlers.size === 0) {
      handlers.delete(channel);
      if (subscriber) {
        subscriber.unsubscribe(channel);
      }
    }
  }
}

export function isRedisEnabled(): boolean {
  return publisher !== null && subscriber !== null;
}

export async function closeRedis(): Promise<void> {
  if (publisher) {
    await publisher.quit();
  }
  if (subscriber) {
    await subscriber.quit();
  }
}
