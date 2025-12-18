import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync, NotificationType } from './src/services/notifications';
import { areaApi } from './src/services/api';
import { Alert } from 'react-native';
import { startNotificationPolling, stopNotificationPolling } from './src/services/notificationPoller';

export default function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const navigationRef = useRef<any>();

  // Handler para acciones de notificaciones
  const handleNotificationAction = async (
    actionIdentifier: string,
    data: any
  ) => {
    console.log('🔔 Notification action:', actionIdentifier, data);

    try {
      switch (actionIdentifier) {
        // Acciones de solicitud de unión a área
        case 'accept':
          if (data.invitationId) {
            await areaApi.acceptInvitation(data.invitationId);
            Alert.alert('Solicitud aceptada', 'El usuario fue agregado al área');
          }
          break;

        case 'reject':
          if (data.invitationId) {
            await areaApi.rejectInvitation(data.invitationId);
            Alert.alert('Solicitud rechazada', 'La solicitud fue rechazada');
          }
          break;

        case 'view':
        case 'view_area':
          if (data.areaId && navigationRef.current) {
            navigationRef.current.navigate('AreaDetail', { areaId: data.areaId });
          }
          break;

        case 'view_event':
          if (data.eventId && navigationRef.current) {
            navigationRef.current.navigate('EventDetail', { eventId: data.eventId });
          }
          break;

        case 'share':
          // TODO: Implementar compartir evento
          console.log('Share event:', data.eventId);
          break;

        case 'reply':
          if (data.eventId && navigationRef.current) {
            navigationRef.current.navigate('EventDetail', {
              eventId: data.eventId,
              openComments: true,
            });
          }
          break;

        case 'like':
          // TODO: Implementar dar like desde la notificación
          console.log('Like event:', data.eventId);
          break;

        case 'dismiss':
          // Solo cerrar la notificación
          break;

        default:
          // Acción por defecto: navegar según el tipo de notificación
          handleDefaultNotificationAction(data);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  // Handler por defecto cuando se toca la notificación
  const handleDefaultNotificationAction = (data: any) => {
    if (!navigationRef.current) return;

    switch (data.type) {
      case NotificationType.AREA_JOIN_ACCEPTED:
      case NotificationType.AREA_JOIN_REQUESTED:
      case NotificationType.AREA_INVITATION:
        if (data.areaId) {
          navigationRef.current.navigate('AreaDetail', { areaId: data.areaId });
        }
        break;

      case NotificationType.EVENT_NEARBY:
      case NotificationType.EVENT_URGENT:
      case NotificationType.COMMENT_REPLY:
      case NotificationType.REACTION:
        if (data.eventId) {
          navigationRef.current.navigate('EventDetail', { eventId: data.eventId });
        }
        break;
    }
  };

  useEffect(() => {
    // Registrar para notificaciones push
    registerForPushNotificationsAsync();

    // Iniciar polling de notificaciones
    startNotificationPolling();

    // Listener para cuando llega una notificación mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📱 Notification received:', notification);
      }
    );

    // Listener para cuando el usuario toca una notificación o acción
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const actionIdentifier = response.actionIdentifier;

        // Manejar la acción o navegación
        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          // El usuario tocó la notificación (no un botón de acción)
          handleDefaultNotificationAction(data);
        } else {
          // El usuario tocó un botón de acción
          handleNotificationAction(actionIdentifier, data);
        }
      }
    );

    return () => {
      try {
        if (notificationListener.current && typeof notificationListener.current.remove === 'function') {
          notificationListener.current.remove();
        }
        if (responseListener.current && typeof responseListener.current.remove === 'function') {
          responseListener.current.remove();
        }
        stopNotificationPolling();
      } catch (error) {
        console.error('Error cleaning up notification listeners:', error);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
