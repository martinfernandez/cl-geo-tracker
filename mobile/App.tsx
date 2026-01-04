import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { AuthProvider } from './src/contexts/AuthContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { PeekModeProvider } from './src/contexts/PeekModeContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
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

  // Handler para deep links
  const handleDeepLink = (url: string) => {
    console.log('🔗 Deep link received:', url);

    if (!navigationRef.current) {
      console.log('Navigation not ready, storing URL for later');
      return;
    }

    try {
      // Parse the URL
      const parsed = Linking.parse(url);
      console.log('Parsed URL:', parsed);

      // Handle different URL patterns
      // geotracker://event/[eventId]
      // https://cl-geo-tracker-production.up.railway.app/e/[eventId]

      if (parsed.scheme === 'geotracker' && parsed.hostname === 'event' && parsed.path) {
        // Custom scheme: geotracker://event/[eventId]
        const eventId = parsed.path;
        console.log('Navigating to event:', eventId);
        navigationRef.current.navigate('EventDetail', { eventId });
      } else if (parsed.path?.startsWith('/e/') || parsed.path?.startsWith('e/')) {
        // Web URL: https://domain.com/e/[eventId]
        const eventId = parsed.path.replace(/^\/e\//, '').replace(/^e\//, '');
        console.log('Navigating to event from web URL:', eventId);
        navigationRef.current.navigate('EventDetail', { eventId });
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  // Handler por defecto cuando se toca la notificación
  const handleDefaultNotificationAction = (data: any) => {
    if (!navigationRef.current) return;

    console.log('🔔 Handling default notification action with data:', data);

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

      case 'FOUND_OBJECT':
      case 'FOUND_OBJECT_MESSAGE':
        if (data.chatId) {
          console.log('🔔 Navigating to FoundChat with chatId:', data.chatId);
          navigationRef.current.navigate('FoundChat', { chatId: data.chatId });
        }
        break;
    }
  };

  useEffect(() => {
    // Registrar para notificaciones push
    registerForPushNotificationsAsync();

    // Iniciar polling de notificaciones
    startNotificationPolling();

    // Handle deep links
    // Check if the app was opened via a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App opened with initial URL:', url);
        // Small delay to ensure navigation is ready
        setTimeout(() => handleDeepLink(url), 500);
      }
    });

    // Listen for deep links while the app is running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

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
        linkingSubscription.remove();
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
      <ThemeProvider>
        <PeekModeProvider>
          <AuthProvider>
            <OnboardingProvider>
              <ToastProvider>
                <NavigationContainer ref={navigationRef}>
                  <AppNavigator />
                </NavigationContainer>
              </ToastProvider>
            </OnboardingProvider>
          </AuthProvider>
        </PeekModeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
