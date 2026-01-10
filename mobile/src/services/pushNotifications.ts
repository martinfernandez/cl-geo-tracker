import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and send token to backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if device is physical (push notifications don't work on simulator)
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'e365a376-c27d-47b9-9855-ce053b6bffc8',
    });
    const token = tokenData.data;

    console.log('Expo push token:', token);

    // Send token to backend
    try {
      await api.post('/users/push-token', { token });
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Error registering push token with backend:', error);
    }

    // Platform-specific channel setup for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.error('Error in registerForPushNotifications:', error);
    return null;
  }
}

/**
 * Setup notification listeners for when app is foregrounded or backgrounded
 */
export function setupNotificationListeners(navigation: any) {
  // Handle notification received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification);
      // You can show a custom in-app notification here if desired
    }
  );

  // Handle notification response (user tapped on notification)
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification response:', response);

      const data = response.notification.request.content.data;

      // Navigate based on notification type
      if (data.type === 'DEVICE_MOVEMENT_ALERT' && data.deviceId) {
        // Navigate to device detail screen for movement alerts
        navigation.navigate('DeviceDetail', {
          deviceId: data.deviceId,
        });
      } else if (data.conversationId && data.eventId && data.senderId) {
        // Navigate to chat screen for message notifications
        navigation.navigate('Chat', {
          conversationId: data.conversationId,
          eventId: data.eventId,
          otherUserId: data.senderId,
        });
      }
    }
  );

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Send a local notification (for testing)
 */
export async function sendLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Show immediately
  });
}

/**
 * Get notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
