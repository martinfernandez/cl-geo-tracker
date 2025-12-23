import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo();

interface PushNotificationData {
  conversationId: string;
  eventId: string;
  senderId: string;
  senderName: string;
}

/**
 * Send a generic push notification
 * @param recipientToken - Expo push token of the recipient
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data for the notification
 */
export async function sendPushNotification(
  recipientToken: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  // Validate the push token
  if (!Expo.isExpoPushToken(recipientToken)) {
    console.error(`Invalid Expo push token: ${recipientToken}`);
    return;
  }

  const message: ExpoPushMessage = {
    to: recipientToken,
    sound: 'default',
    title,
    body,
    data,
    badge: 1,
    priority: 'high',
  };

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    console.log('Push notification sent:', ticketChunk);

    ticketChunk.forEach((ticket: ExpoPushTicket) => {
      if (ticket.status === 'error') {
        console.error('Error sending push notification:', ticket.message);
        if (ticket.details?.error) {
          console.error('Error details:', ticket.details.error);
        }
      }
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Send a device movement alert notification
 * @param recipientToken - Expo push token of the recipient
 * @param deviceName - Name of the device that moved
 * @param deviceId - ID of the device
 * @param distance - Distance moved in meters
 */
export async function sendDeviceMovementAlert(
  recipientToken: string,
  deviceName: string,
  deviceId: string,
  distance: number
): Promise<void> {
  const title = `Alerta de movimiento`;
  const body = `${deviceName} se ha movido ${distance.toFixed(0)}m de su posición bloqueada`;

  await sendPushNotification(recipientToken, title, body, {
    type: 'DEVICE_MOVEMENT_ALERT',
    deviceId,
    distance,
  });
}

/**
 * Send a push notification for a new message
 * @param recipientToken - Expo push token of the recipient
 * @param messageContent - Content of the message
 * @param data - Additional data for navigation
 */
export async function sendMessageNotification(
  recipientToken: string,
  messageContent: string,
  data: PushNotificationData
): Promise<void> {
  // Validate the push token
  if (!Expo.isExpoPushToken(recipientToken)) {
    console.error(`Invalid Expo push token: ${recipientToken}`);
    return;
  }

  // Truncate message content if too long
  const truncatedMessage = messageContent.length > 100
    ? messageContent.substring(0, 97) + '...'
    : messageContent;

  const message: ExpoPushMessage = {
    to: recipientToken,
    sound: 'default',
    title: `Nuevo mensaje de ${data.senderName}`,
    body: truncatedMessage,
    data: {
      type: 'NEW_MESSAGE',
      conversationId: data.conversationId,
      eventId: data.eventId,
      senderId: data.senderId,
    },
    badge: 1,
    priority: 'high',
  };

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    console.log('Push notification sent:', ticketChunk);

    // Check for errors in the ticket
    ticketChunk.forEach((ticket: ExpoPushTicket) => {
      if (ticket.status === 'error') {
        console.error('Error sending push notification:', ticket.message);
        if (ticket.details?.error) {
          console.error('Error details:', ticket.details.error);
        }
      }
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Send multiple push notifications at once
 * @param notifications - Array of notification data
 */
export async function sendBatchNotifications(
  notifications: Array<{
    token: string;
    messageContent: string;
    data: PushNotificationData;
  }>
): Promise<void> {
  const messages: ExpoPushMessage[] = notifications
    .filter(n => Expo.isExpoPushToken(n.token))
    .map(n => {
      const truncatedMessage = n.messageContent.length > 100
        ? n.messageContent.substring(0, 97) + '...'
        : n.messageContent;

      return {
        to: n.token,
        sound: 'default',
        title: `Nuevo mensaje de ${n.data.senderName}`,
        body: truncatedMessage,
        data: {
          type: 'NEW_MESSAGE',
          conversationId: n.data.conversationId,
          eventId: n.data.eventId,
          senderId: n.data.senderId,
        },
        badge: 1,
        priority: 'high',
      } as ExpoPushMessage;
    });

  if (messages.length === 0) {
    console.log('No valid push tokens to send notifications to');
    return;
  }

  try {
    // Expo recommends batching notifications in chunks of 100
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('Batch push notifications sent:', ticketChunk.length);

      ticketChunk.forEach((ticket: ExpoPushTicket) => {
        if (ticket.status === 'error') {
          console.error('Error in batch notification:', ticket.message);
        }
      });
    }
  } catch (error) {
    console.error('Error sending batch push notifications:', error);
  }
}
