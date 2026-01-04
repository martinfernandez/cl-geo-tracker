import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { wsService } from '../services/websocket';
import { useNavigation } from '@react-navigation/native';

interface NotificationData {
  id: string;
  senderName: string;
  message: string;
  conversationId: string;
  eventId: string;
  otherUserId: string;
  type?: 'message' | 'area_event';
  areaNames?: string;
}

export default function MessageNotification() {
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [slideAnim] = useState(new Animated.Value(-100));
  const navigation = useNavigation<any>();

  const showNotificationWithData = (data: NotificationData) => {
    setNotification(data);

    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    // Auto hide after 4 seconds
    setTimeout(() => {
      hideNotification();
    }, 4000);
  };

  useEffect(() => {
    const handleNewMessage = (data: any) => {
      // Don't show notification if already in chat
      const currentRoute = navigation.getState()?.routes?.slice(-1)[0];
      if (currentRoute?.name === 'Chat' && currentRoute?.params?.conversationId === data.conversationId) {
        return;
      }

      const senderName = data.message?.sender?.name || 'Nuevo mensaje';
      const messageContent = data.message?.content || '';

      showNotificationWithData({
        id: data.message?.id || Date.now().toString(),
        senderName,
        message: messageContent.length > 50 ? messageContent.substring(0, 47) + '...' : messageContent,
        conversationId: data.conversationId,
        eventId: data.eventId || '',
        otherUserId: data.message?.senderId || '',
        type: 'message',
      });
    };

    const handleAreaEvent = (data: any) => {
      const eventTypeLabels: Record<string, string> = {
        THEFT: 'Robo',
        LOST: 'Perdido',
        ACCIDENT: 'Accidente',
        FIRE: 'Incendio',
      };

      const typeLabel = eventTypeLabels[data.event?.type] || data.event?.type;
      const description = data.event?.description || '';

      showNotificationWithData({
        id: data.event?.id || Date.now().toString(),
        senderName: `${data.event?.isUrgent ? '🚨 ' : ''}${typeLabel} en ${data.areaNames}`,
        message: description.length > 50 ? description.substring(0, 47) + '...' : description,
        conversationId: '',
        eventId: data.event?.id || '',
        otherUserId: '',
        type: 'area_event',
        areaNames: data.areaNames,
      });
    };

    wsService.on('new_message', handleNewMessage);
    wsService.on('area_event', handleAreaEvent);

    return () => {
      wsService.off('new_message', handleNewMessage);
      wsService.off('area_event', handleAreaEvent);
    };
  }, [navigation]);

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  };

  const handlePress = () => {
    if (notification) {
      hideNotification();
      navigation.navigate('Chat', {
        conversationId: notification.conversationId,
        eventId: notification.eventId,
        otherUserId: notification.otherUserId,
      });
    }
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.senderName}>{notification.senderName}</Text>
          <Text style={styles.message} numberOfLines={1}>{notification.message}</Text>
        </View>
        <TouchableOpacity onPress={hideNotification} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
