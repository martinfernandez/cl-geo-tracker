import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuración de notificaciones al estilo Instagram
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// Tipos de notificaciones
export enum NotificationType {
  AREA_JOIN_ACCEPTED = 'AREA_JOIN_ACCEPTED',
  AREA_JOIN_REQUESTED = 'AREA_JOIN_REQUESTED',
  AREA_INVITATION = 'AREA_INVITATION',
  EVENT_NEARBY = 'EVENT_NEARBY',
  EVENT_URGENT = 'EVENT_URGENT',
  COMMENT_REPLY = 'COMMENT_REPLY',
  REACTION = 'REACTION',
}

// Categorías de notificaciones con acciones
export enum NotificationCategory {
  AREA_REQUEST = 'AREA_REQUEST',
  AREA_ACCEPTED = 'AREA_ACCEPTED',
  EVENT_ALERT = 'EVENT_ALERT',
  SOCIAL = 'SOCIAL',
}

export interface NotificationData {
  type: NotificationType;
  areaId?: string;
  areaName?: string;
  userName?: string;
  eventId?: string;
  eventType?: string;
  invitationId?: string;
  [key: string]: any;
}

export async function registerForPushNotificationsAsync() {
  let token;

  // Configurar categorías de notificaciones con acciones (estilo Instagram)
  await setupNotificationCategories();

  if (Platform.OS === 'android') {
    // Canal para áreas
    await Notifications.setNotificationChannelAsync('areas', {
      name: 'Áreas de Interés',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
      sound: 'default',
      enableVibrate: true,
    });

    // Canal para eventos
    await Notifications.setNotificationChannelAsync('events', {
      name: 'Eventos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 100, 250],
      lightColor: '#FF3B30',
      sound: 'default',
      enableVibrate: true,
    });

    // Canal para social (reacciones, comentarios)
    await Notifications.setNotificationChannelAsync('social', {
      name: 'Social',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#34C759',
      sound: 'default',
      enableVibrate: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  // En desarrollo, usamos el token del dispositivo
  // En producción, aquí obtendrías el Expo Push Token
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
  } catch (error) {
    console.log('Error getting push token:', error);
  }

  return token;
}

// Configurar categorías de notificaciones con acciones rápidas
async function setupNotificationCategories() {
  // Categoría: Solicitudes de unión a área (con acciones Aceptar/Rechazar)
  await Notifications.setNotificationCategoryAsync(
    NotificationCategory.AREA_REQUEST,
    [
      {
        identifier: 'accept',
        buttonTitle: 'Aceptar',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'reject',
        buttonTitle: 'Rechazar',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'view',
        buttonTitle: 'Ver',
        options: {
          opensAppToForeground: true,
        },
      },
    ]
  );

  // Categoría: Aceptación en área (con acción Ver área)
  await Notifications.setNotificationCategoryAsync(
    NotificationCategory.AREA_ACCEPTED,
    [
      {
        identifier: 'view_area',
        buttonTitle: 'Ver Área',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'OK',
        options: {
          opensAppToForeground: false,
        },
      },
    ]
  );

  // Categoría: Eventos cercanos/urgentes (con acciones Ver/Compartir)
  await Notifications.setNotificationCategoryAsync(
    NotificationCategory.EVENT_ALERT,
    [
      {
        identifier: 'view_event',
        buttonTitle: 'Ver Evento',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'share',
        buttonTitle: 'Compartir',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Cerrar',
        options: {
          opensAppToForeground: false,
        },
      },
    ]
  );

  // Categoría: Social (reacciones, comentarios) con acción Responder
  await Notifications.setNotificationCategoryAsync(NotificationCategory.SOCIAL, [
    {
      identifier: 'reply',
      buttonTitle: 'Responder',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'like',
      buttonTitle: 'Me gusta',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

// Mostrar notificación local con estilo Instagram
export async function showLocalNotification(
  title: string,
  body: string,
  data?: NotificationData,
  category?: NotificationCategory
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
      badge: 1,
      // Estilo Instagram: prioridad alta, vibración
      priority: Notifications.AndroidNotificationPriority.HIGH,
      vibrate: [0, 250, 250, 250],
      categoryIdentifier: category || undefined,
    },
    trigger: null, // Mostrar inmediatamente
  });
}

// Notificación específica para cuando te aceptan en un área
export async function showAreaJoinAcceptedNotification(
  areaName: string,
  areaId: string
) {
  await showLocalNotification(
    `Bienvenido a ${areaName}`,
    `Tu solicitud fue aceptada. Ahora puedes ver todos los eventos del área.`,
    {
      type: NotificationType.AREA_JOIN_ACCEPTED,
      areaId,
      areaName,
    },
    NotificationCategory.AREA_ACCEPTED
  );
}

// Notificación para cuando alguien solicita unirse a tu área
export async function showAreaJoinRequestNotification(
  userName: string,
  areaName: string,
  areaId: string,
  invitationId: string
) {
  await showLocalNotification(
    `Nueva solicitud de ${userName}`,
    `Quiere unirse a "${areaName}"`,
    {
      type: NotificationType.AREA_JOIN_REQUESTED,
      areaId,
      areaName,
      userName,
      invitationId,
    },
    NotificationCategory.AREA_REQUEST
  );
}

// Notificación para evento cercano
export async function showEventNearbyNotification(
  eventType: string,
  distance: string,
  eventId: string
) {
  await showLocalNotification(
    `${eventType} cerca de ti`,
    `A ${distance} de tu ubicación`,
    {
      type: NotificationType.EVENT_NEARBY,
      eventId,
      eventType,
    },
    NotificationCategory.EVENT_ALERT
  );
}

// Notificación para evento urgente
export async function showEventUrgentNotification(
  eventType: string,
  description: string,
  eventId: string
) {
  await showLocalNotification(
    `ALERTA: ${eventType}`,
    description,
    {
      type: NotificationType.EVENT_URGENT,
      eventId,
      eventType,
    },
    NotificationCategory.EVENT_ALERT
  );
}

// Notificación para reacción a tu evento
export async function showReactionNotification(
  userName: string,
  eventDescription: string,
  eventId: string
) {
  await showLocalNotification(
    `A ${userName} le gusta tu evento`,
    eventDescription,
    {
      type: NotificationType.REACTION,
      eventId,
      userName,
    },
    NotificationCategory.SOCIAL
  );
}

// Notificación para comentario en tu evento
export async function showCommentReplyNotification(
  userName: string,
  comment: string,
  eventId: string
) {
  await showLocalNotification(
    `${userName} comentó`,
    comment,
    {
      type: NotificationType.COMMENT_REPLY,
      eventId,
      userName,
    },
    NotificationCategory.SOCIAL
  );
}

// Limpiar todas las notificaciones
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

// Obtener badge count
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Actualizar badge count
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}
