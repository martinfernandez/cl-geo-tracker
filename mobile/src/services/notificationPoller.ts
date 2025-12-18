import { notificationApi } from './api';
import {
  showAreaJoinAcceptedNotification,
  showCommentReplyNotification,
  showReactionNotification,
  showAreaJoinRequestNotification,
} from './notifications';

let pollingInterval: NodeJS.Timeout | null = null;
let lastCheckedTimestamp: Date | null = null;
let shownNotificationIds: Set<string> = new Set();

export const startNotificationPolling = async () => {
  // Set initial timestamp to now to avoid showing old notifications on startup
  if (!lastCheckedTimestamp) {
    lastCheckedTimestamp = new Date();
  }

  // Poll every 10 seconds (reduced frequency to avoid duplicates)
  pollingInterval = setInterval(async () => {
    try {
      const notifications = await notificationApi.getUserNotifications(true); // unread only

      // Filter notifications that haven't been shown yet
      const newNotifications = notifications.filter((notif: any) => {
        // Skip if already shown
        if (shownNotificationIds.has(notif.id)) {
          return false;
        }

        // Only show notifications created after last check
        const notifDate = new Date(notif.createdAt);
        return notifDate > lastCheckedTimestamp!;
      });

      console.log(`Found ${newNotifications.length} new notifications to show`);

      // Show native notifications for each new notification
      for (const notif of newNotifications) {
        console.log('Showing notification:', notif.id, notif.type, notif.content);
        await showNativeNotification(notif);
        // Mark this notification as shown IMMEDIATELY
        shownNotificationIds.add(notif.id);
      }

      // Update timestamp to current time
      if (newNotifications.length > 0) {
        lastCheckedTimestamp = new Date();
      }

      // Clean up old notification IDs (keep only last 100)
      if (shownNotificationIds.size > 100) {
        const idsArray = Array.from(shownNotificationIds);
        shownNotificationIds = new Set(idsArray.slice(-100));
      }
    } catch (error) {
      console.error('Error polling notifications:', error);
    }
  }, 10000); // Poll every 10 seconds
};

export const stopNotificationPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  // Reset the shown notifications set when stopping
  shownNotificationIds.clear();
};

const showNativeNotification = async (notif: any) => {
  // Skip if notification was already shown
  if (shownNotificationIds.has(notif.id)) {
    return;
  }

  switch (notif.type) {
    case 'AREA_JOIN_ACCEPTED':
      // Extract area name from content
      const areaNameMatch = notif.content.match(/"([^"]+)"/);
      const areaName = areaNameMatch ? areaNameMatch[1] : 'el área';
      await showAreaJoinAcceptedNotification(areaName, notif.areaId || '');
      break;

    case 'AREA_JOIN_REQUEST':
      // Extract requester name and area name from content
      const requestMatch = notif.content.match(/(.+) ha solicitado unirse al área "([^"]+)"/);
      const requesterName = requestMatch ? requestMatch[1] : (notif.sender?.name || 'Alguien');
      const requestedAreaName = requestMatch ? requestMatch[2] : 'un área';
      await showAreaJoinRequestNotification(requesterName, requestedAreaName, notif.areaId || '', notif.id);
      break;

    case 'EVENT_REACTION':
      const senderName = notif.sender?.name || 'Alguien';
      // Use notification content which already has the full message
      await showReactionNotification(senderName, 'reaccionó a tu evento', notif.eventId || '');
      break;

    case 'EVENT_COMMENT':
    case 'COMMENT_REPLY':
      const commenterName = notif.sender?.name || 'Alguien';
      await showCommentReplyNotification(commenterName, notif.content, notif.eventId || '');
      break;

    default:
      console.log('Unknown notification type:', notif.type);
  }
};
