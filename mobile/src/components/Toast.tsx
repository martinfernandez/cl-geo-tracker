import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows } from '../theme/colors';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const toastConfig = {
  success: {
    icon: 'checkmark-circle' as const,
    color: colors.success.main,
    bgColor: colors.success.subtle,
    borderColor: colors.success.light,
  },
  error: {
    icon: 'close-circle' as const,
    color: colors.error.main,
    bgColor: colors.error.subtle,
    borderColor: colors.error.light,
  },
  warning: {
    icon: 'warning' as const,
    color: colors.warning.dark,
    bgColor: colors.warning.subtle,
    borderColor: colors.warning.light,
  },
  info: {
    icon: 'information-circle' as const,
    color: colors.info.main,
    bgColor: colors.info.subtle,
    borderColor: colors.info.light,
  },
};

// Playful messages for different scenarios
export const playfulMessages = {
  loginSuccess: [
    'De vuelta en accion',
    'Todo listo para explorar',
    'Bienvenido de nuevo',
  ],
  loginError: [
    'Hmm, algo no cuadra',
    'Revisemos esos datos',
    'Intenta de nuevo',
  ],
  networkError: [
    'Sin conexion por ahora',
    'La red nos abandono',
    'Conexion perdida',
  ],
  eventCreated: [
    'Reporte enviado',
    'Comunidad alertada',
    'Gracias por reportar',
  ],
  deviceAdded: [
    'Dispositivo vinculado',
    'Nuevo integrante del equipo',
    'Conexion establecida',
  ],
  saved: [
    'Cambios guardados',
    'Todo en orden',
    'Listo',
  ],
};

export const getRandomMessage = (category: keyof typeof playfulMessages): string => {
  const messages = playfulMessages[category];
  return messages[Math.floor(Math.random() * messages.length)];
};

export function Toast({
  visible,
  type,
  title,
  message,
  duration = 4000,
  onDismiss,
  action,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = toastConfig[type];

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, translateY, opacity]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        const timer = setTimeout(hideToast, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, duration, hideToast, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: config.bgColor,
            borderLeftColor: config.color,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
          <Ionicons name={config.icon} size={20} color="#fff" />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.neutral[900] }]}>
            {title}
          </Text>
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
        </View>

        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              action.onPress();
              hideToast();
            }}
          >
            <Text style={[styles.actionText, { color: config.color }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.closeButton}
          onPress={hideToast}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.neutral[400]} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    backgroundColor: '#fff',
    ...shadows.lg,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
});

export default Toast;
