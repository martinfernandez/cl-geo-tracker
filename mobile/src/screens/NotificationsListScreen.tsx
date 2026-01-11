import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationApi, Notification } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { FadeInView } from '../components/FadeInView';

export default function NotificationsListScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getUserNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.isRead) {
        await notificationApi.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      }

      // Navigate to relevant screen based on notification type
      if (notification.type === 'DEVICE_MOVEMENT_ALERT' && notification.deviceId) {
        navigation.navigate('DeviceDetail', { deviceId: notification.deviceId });
      } else if (notification.areaId) {
        navigation.navigate('AreaDetail', { areaId: notification.areaId });
      } else if (notification.eventId) {
        navigation.navigate('EventDetail', { eventId: notification.eventId });
      } else if (notification.chatId && (notification.type === 'FOUND_OBJECT' || notification.type === 'FOUND_OBJECT_MESSAGE')) {
        navigation.navigate('FoundChat', { chatId: notification.chatId });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      Alert.alert('Éxito', 'Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'No se pudieron marcar las notificaciones como leídas');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationApi.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'No se pudo eliminar la notificación');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVENT_REACTION':
        return 'heart';
      case 'EVENT_COMMENT':
      case 'COMMENT_REPLY':
        return 'chatbubble';
      case 'AREA_JOIN_REQUEST':
        return 'person-add';
      case 'AREA_JOIN_ACCEPTED':
        return 'checkmark-circle';
      case 'AREA_INVITATION':
        return 'mail';
      case 'FOUND_OBJECT':
      case 'FOUND_OBJECT_MESSAGE':
        return 'locate';
      case 'DEVICE_MOVEMENT_ALERT':
        return 'warning';
      default:
        return 'notifications';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item, index }: { item: Notification; index: number }) => {
    return (
      <FadeInView delay={index * 50} duration={350}>
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: theme.surface },
          !item.isRead && {
            backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : '#F0F8FF',
            borderLeftWidth: 3,
            borderLeftColor: theme.primary.main,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationIcon}>
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={24}
            color={item.isRead ? theme.textSecondary : theme.primary.main}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text
            style={[
              styles.notificationText,
              { color: item.isRead ? theme.textSecondary : theme.text },
              !item.isRead && { fontWeight: '500' },
            ]}
          >
            {item.content}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.textTertiary }]}>{formatTimestamp(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Eliminar notificación',
              '¿Estás seguro de que quieres eliminar esta notificación?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () => handleDeleteNotification(item.id),
                },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
      </FadeInView>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgSecondary }]}>
        <ActivityIndicator size="large" color={theme.primary.main} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando notificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notificaciones</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.headerButton}
          >
            <Ionicons name="checkmark-done" size={24} color={theme.primary.main} />
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.headerSpacer} />}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No tienes notificaciones</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Aquí aparecerán las notificaciones sobre tus eventos y áreas de interés
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
  },
  notificationTextUnread: {
    color: '#262626',
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 13,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
});
