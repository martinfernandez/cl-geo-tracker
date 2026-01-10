import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
  Dimensions,
} from 'react-native';

// Skeleton component with shimmer animation
function Skeleton({ width, height, borderRadius = 8, style, bgColor = '#E5E5EA' }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
  bgColor?: string;
}) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: bgColor,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Skeleton for Map section
function MapSkeleton({ isDark = false }: { isDark?: boolean }) {
  const skeletonBg = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={skeletonStyles.mapContainer}>
      <Skeleton width="100%" height={200} borderRadius={0} bgColor={skeletonBg} />
      <View style={skeletonStyles.mapLegend}>
        <Skeleton width={100} height={24} bgColor={skeletonBg} />
      </View>
    </View>
  );
}

// Skeleton for Status Card
function StatusCardSkeleton({ isDark = false }: { isDark?: boolean }) {
  const skeletonBg = isDark ? '#3A3A3C' : '#E5E5EA';
  const cardBg = isDark ? '#1C1C1E' : '#fff';
  const borderColor = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={[skeletonStyles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={skeletonStyles.cardRow}>
        <Skeleton width={50} height={50} borderRadius={25} bgColor={skeletonBg} />
        <View style={skeletonStyles.cardContent}>
          <Skeleton width={120} height={20} style={{ marginBottom: 8 }} bgColor={skeletonBg} />
          <Skeleton width={180} height={14} bgColor={skeletonBg} />
        </View>
      </View>
    </View>
  );
}

// Skeleton for Battery Card
function BatteryCardSkeleton({ isDark = false }: { isDark?: boolean }) {
  const skeletonBg = isDark ? '#3A3A3C' : '#E5E5EA';
  const cardBg = isDark ? '#1C1C1E' : '#fff';
  const borderColor = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={[skeletonStyles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={skeletonStyles.cardRow}>
        <Skeleton width={50} height={50} borderRadius={12} bgColor={skeletonBg} />
        <View style={skeletonStyles.cardContent}>
          <Skeleton width={100} height={20} style={{ marginBottom: 8 }} bgColor={skeletonBg} />
          <Skeleton width={150} height={14} bgColor={skeletonBg} />
        </View>
      </View>
    </View>
  );
}

// Skeleton for Alert Card
function AlertCardSkeleton({ isDark = false }: { isDark?: boolean }) {
  const skeletonBg = isDark ? '#3A3A3C' : '#E5E5EA';
  const cardBg = isDark ? 'rgba(255, 59, 48, 0.15)' : '#FFF5F5';
  const borderColor = isDark ? '#FF3B30' : '#FFD5D5';
  return (
    <View style={[skeletonStyles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={skeletonStyles.cardRow}>
        <Skeleton width={50} height={50} borderRadius={25} bgColor={skeletonBg} />
        <View style={skeletonStyles.cardContent}>
          <Skeleton width={120} height={20} style={{ marginBottom: 8 }} bgColor={skeletonBg} />
          <Skeleton width="90%" height={14} bgColor={skeletonBg} />
        </View>
      </View>
    </View>
  );
}

// Skeleton for Device Info Section
function DeviceInfoSkeleton({ isDark = false }: { isDark?: boolean }) {
  const skeletonBg = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={skeletonStyles.section}>
      <Skeleton width={200} height={22} style={{ marginBottom: 16 }} bgColor={skeletonBg} />
      <Skeleton width={40} height={14} style={{ marginBottom: 8, marginTop: 12 }} bgColor={skeletonBg} />
      <Skeleton width="100%" height={44} style={{ marginBottom: 12 }} bgColor={skeletonBg} />
      <Skeleton width={140} height={14} style={{ marginBottom: 8, marginTop: 12 }} bgColor={skeletonBg} />
      <Skeleton width="100%" height={44} style={{ marginBottom: 16 }} bgColor={skeletonBg} />
      <Skeleton width="100%" height={48} bgColor={skeletonBg} />
    </View>
  );
}

// Skeleton for QR Section
function QRSectionSkeleton({ isDark = false }: { isDark?: boolean }) {
  const skeletonBg = isDark ? '#3A3A3C' : '#E5E5EA';
  const cardBg = isDark ? '#1C1C1E' : '#fff';
  const borderColor = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={skeletonStyles.section}>
      <Skeleton width={100} height={22} style={{ marginBottom: 16 }} bgColor={skeletonBg} />
      <View style={[skeletonStyles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={skeletonStyles.cardRow}>
          <Skeleton width={56} height={56} borderRadius={12} bgColor={skeletonBg} />
          <View style={skeletonStyles.cardContent}>
            <Skeleton width={80} height={18} style={{ marginBottom: 8 }} bgColor={skeletonBg} />
            <Skeleton width="90%" height={36} bgColor={skeletonBg} />
          </View>
        </View>
        <Skeleton width="100%" height={48} style={{ marginTop: 16 }} bgColor={skeletonBg} />
      </View>
    </View>
  );
}

// Skeleton for Position Section
function PositionSkeleton({ isDark = false }: { isDark?: boolean }) {
  const skeletonBg = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={skeletonStyles.section}>
      <Skeleton width={140} height={22} style={{ marginBottom: 16 }} bgColor={skeletonBg} />
      <Skeleton width="80%" height={14} style={{ marginBottom: 6 }} bgColor={skeletonBg} />
      <Skeleton width="50%" height={14} style={{ marginBottom: 6 }} bgColor={skeletonBg} />
      <Skeleton width="60%" height={14} bgColor={skeletonBg} />
    </View>
  );
}

// Skeleton for Lock Section
function LockSectionSkeleton({ isDark = false }: { isDark?: boolean }) {
  const skeletonBg = isDark ? '#3A3A3C' : '#E5E5EA';
  const cardBg = isDark ? '#2C2C2E' : '#F8F9FA';
  const borderColor = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={skeletonStyles.section}>
      <Skeleton width={180} height={22} style={{ marginBottom: 16 }} bgColor={skeletonBg} />
      <View style={[skeletonStyles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={skeletonStyles.cardRow}>
          <Skeleton width={24} height={24} borderRadius={12} bgColor={skeletonBg} />
          <Skeleton width={180} height={18} style={{ marginLeft: 10 }} bgColor={skeletonBg} />
        </View>
        <Skeleton width="100%" height={14} style={{ marginTop: 12, marginBottom: 16 }} bgColor={skeletonBg} />
        <Skeleton width="100%" height={40} style={{ marginBottom: 16 }} bgColor={skeletonBg} />
        <Skeleton width="100%" height={48} bgColor={skeletonBg} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  mapContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
});
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { deviceApi, eventApi, positionApi, Device } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 200;

// Component for the pulsing status indicator
// status: 'reporting' (green) | 'connected' (yellow/orange) | 'offline' (red)
function StatusIndicator({ status, size = 'large' }: { status: 'reporting' | 'connected' | 'offline'; size?: 'large' | 'normal' }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  const baseSize = size === 'large' ? 20 : 14;
  const color = status === 'reporting' ? '#34C759' : status === 'connected' ? '#FF9500' : '#FF3B30';
  const pulseOpacity = status === 'reporting' ? 0.4 : status === 'connected' ? 0.3 : 0.2;

  return (
    <View style={{ width: baseSize * 2.5, height: baseSize * 2.5, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: baseSize * 2,
          height: baseSize * 2,
          borderRadius: baseSize,
          backgroundColor: color,
          opacity: opacityAnim.interpolate({
            inputRange: [0, 0.6],
            outputRange: [0, pulseOpacity],
          }),
          transform: [{ scale: pulseAnim }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: baseSize,
          height: baseSize,
          borderRadius: baseSize / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// Calculate if device is reporting recently (within last 5 minutes)
// Use createdAt (server time) instead of timestamp (GPS device time)
// because some GPS devices have incorrect internal clocks
function isDeviceReporting(lastPosition: any): boolean {
  if (!lastPosition) return false;
  const lastUpdate = new Date(lastPosition.createdAt || lastPosition.timestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  return diffMinutes <= 5;
}

// Calculate device connectivity status
// Returns: 'reporting' | 'connected' | 'offline'
// - 'reporting': has recent GPS positions (within 5 min)
// - 'connected': has recent battery/status updates (within 10 min) but no GPS
// - 'offline': no recent activity
function getDeviceStatus(device: any, lastPosition: any): 'reporting' | 'connected' | 'offline' {
  const now = new Date();

  // Check if reporting GPS positions
  if (lastPosition) {
    const positionTime = new Date(lastPosition.createdAt || lastPosition.timestamp);
    const diffMinutes = (now.getTime() - positionTime.getTime()) / (1000 * 60);
    if (diffMinutes <= 5) return 'reporting';
  }

  // Check if device has recent battery updates (connected but not sending GPS)
  if (device?.batteryUpdatedAt) {
    const batteryTime = new Date(device.batteryUpdatedAt);
    const diffMinutes = (now.getTime() - batteryTime.getTime()) / (1000 * 60);
    if (diffMinutes <= 10) return 'connected';
  }

  return 'offline';
}

// Format time ago with more detail
function formatTimeAgoDetailed(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffSeconds < 60) return 'Hace unos segundos';
  if (diffMinutes === 1) return 'Hace 1 minuto';
  if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
  if (diffHours === 1) return 'Hace 1 hora';
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays === 1) return 'Hace 1 día';
  return `Hace ${diffDays} días`;
}
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params: { deviceId: string } }, 'params'>;
};

const EVENT_TYPES = [
  { label: 'Robo', value: 'THEFT' },
  { label: 'Extravío', value: 'LOST' },
  { label: 'Accidente', value: 'ACCIDENT' },
  { label: 'Incendio', value: 'FIRE' },
];

export default function DeviceDetailScreen({ navigation, route }: Props) {
  const { deviceId } = route.params;
  const [device, setDevice] = useState<Device | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertType, setAlertType] = useState('THEFT');
  const [alertDescription, setAlertDescription] = useState('');
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [realTimeTracking, setRealTimeTracking] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();
  const { theme, isDark } = useTheme();

  // Lock/Geofence state
  const [lockRadius, setLockRadius] = useState(0);
  const [lockingDevice, setLockingDevice] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // User location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  // Animation for map refresh fade
  const mapFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadDevice();
    loadUserLocation();
  }, [deviceId]);

  const loadUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const handleRefreshLocation = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);

      // Fade out quickly
      Animated.timing(mapFadeAnim, {
        toValue: 0.4,
        duration: 150,
        useNativeDriver: true,
      }).start();

      // Fetch only the device data (includes latest position)
      const deviceData = await deviceApi.getById(deviceId);

      // Update only positions-related state
      setDevice(prev => prev ? { ...prev, positions: deviceData.positions } : deviceData);

      // Animate map to new position if available
      const newPosition = deviceData.positions?.[0];
      if (newPosition && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: newPosition.latitude,
          longitude: newPosition.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 300);
      }

      // Fade in quickly
      Animated.timing(mapFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('Error refreshing location:', error);
      // Restore opacity on error
      mapFadeAnim.setValue(1);
    } finally {
      setRefreshing(false);
    }
  };

  const loadDevice = async () => {
    try {
      setLoading(true);
      const deviceData = await deviceApi.getById(deviceId);
      setDevice(deviceData);
      setDeviceName(deviceData.name || '');
      setLockRadius(deviceData.lockRadius || 0);

      // Check for active urgent alerts for this device
      if ((deviceData as any).events) {
        const urgentAlert = (deviceData as any).events.find(
          (e: any) => e.isUrgent && e.status === 'IN_PROGRESS'
        );
        setActiveAlert(urgentAlert);
      }
    } catch (error) {
      console.error('Error loading device:', error);
      Alert.alert('Error', 'No se pudo cargar el dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const handleLockDevice = async () => {
    if (!device?.positions || device.positions.length === 0) {
      showWarning('Sin ubicacion', 'El dispositivo no tiene ubicacion disponible para bloquear');
      return;
    }

    try {
      setLockingDevice(true);
      const updatedDevice = await deviceApi.lock(deviceId, lockRadius);
      setDevice(updatedDevice);
      showSuccess(
        'Dispositivo Bloqueado',
        lockRadius === 0
          ? 'Recibiras una notificacion si el dispositivo se mueve.'
          : `Recibiras una notificacion si el dispositivo se mueve mas de ${lockRadius}m.`
      );
    } catch (error: any) {
      console.error('Error locking device:', error);
      showError('Error', error.response?.data?.error || 'No se pudo bloquear el dispositivo');
    } finally {
      setLockingDevice(false);
    }
  };

  const handleUnlockDevice = async () => {
    try {
      setLockingDevice(true);
      const updatedDevice = await deviceApi.unlock(deviceId);
      setDevice(updatedDevice);
      showSuccess('Dispositivo Desbloqueado', 'Ya no recibiras alertas de movimiento.');
    } catch (error: any) {
      console.error('Error unlocking device:', error);
      showError('Error', error.response?.data?.error || 'No se pudo desbloquear el dispositivo');
    } finally {
      setLockingDevice(false);
    }
  };

  const handleSaveDevice = async () => {
    try {
      setSaving(true);
      await deviceApi.update(deviceId, { name: deviceName });
      Alert.alert('Éxito', 'Dispositivo actualizado');
    } catch (error) {
      console.error('Error updating device:', error);
      Alert.alert('Error', 'No se pudo actualizar el dispositivo');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!alertDescription.trim()) {
      Alert.alert('Error', 'Por favor describe la alerta');
      return;
    }

    if (!device.positions || device.positions.length === 0) {
      Alert.alert('Error', 'El dispositivo no tiene ubicación disponible');
      return;
    }

    const lastPosition = device.positions[0];

    try {
      setCreatingAlert(true);
      await eventApi.create({
        deviceId,
        type: alertType,
        description: alertDescription.trim(),
        latitude: lastPosition.latitude,
        longitude: lastPosition.longitude,
        isUrgent: true,
        realTimeTracking,
      });

      setShowAlertModal(false);
      setAlertDescription('');

      // Navigate to Map screen to see the new urgent event
      navigation.navigate('Main', {
        screen: 'Map',
        params: { refresh: true }
      });
    } catch (error: any) {
      console.error('Error creating alert:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo crear la alerta');
    } finally {
      setCreatingAlert(false);
    }
  };

  const handleCloseAlert = async () => {
    if (!activeAlert) return;

    try {
      await eventApi.update(activeAlert.id, { status: 'CLOSED', isUrgent: false });
      Alert.alert('Éxito', 'Alerta cerrada');
      setActiveAlert(null);
      loadDevice();
    } catch (error) {
      console.error('Error closing alert:', error);
      Alert.alert('Error', 'No se pudo cerrar la alerta');
    }
  };

  // Show skeleton loading state - header always visible
  if (loading) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.bg }]}
      >
        {/* Header - always visible first */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Detalle del Dispositivo</Text>
          <View style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color={theme.textSecondary} />
          </View>
        </View>

        <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]}>
          {/* Map Skeleton */}
          <MapSkeleton isDark={isDark} />

          <View style={[styles.content, { backgroundColor: theme.bg }]}>
            {/* Status Card Skeleton */}
            <StatusCardSkeleton isDark={isDark} />

            {/* Battery Card Skeleton */}
            <BatteryCardSkeleton isDark={isDark} />

            {/* Alert Card Skeleton */}
            <AlertCardSkeleton isDark={isDark} />

            {/* Device Info Skeleton */}
            <DeviceInfoSkeleton isDark={isDark} />

            {/* QR Section Skeleton */}
            <QRSectionSkeleton isDark={isDark} />

            {/* Position Skeleton */}
            <PositionSkeleton isDark={isDark} />

            {/* Lock Section Skeleton */}
            <LockSectionSkeleton isDark={isDark} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header - always visible */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Detalle del Dispositivo</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>No se pudo cargar el dispositivo</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.primary.main }]}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const lastPosition = device.positions?.[0];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Detalle del Dispositivo</Text>
        <TouchableOpacity
          onPress={handleRefreshLocation}
          style={styles.headerButton}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.primary.main} />
          ) : (
            <Ionicons name="refresh" size={24} color={theme.primary.main} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]}>
        {/* Device Location Map */}
        {lastPosition && (
          <Animated.View style={[styles.mapContainer, { opacity: mapFadeAnim }]}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude: lastPosition.latitude,
                longitude: lastPosition.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {/* Device Marker */}
              <Marker
                coordinate={{
                  latitude: lastPosition.latitude,
                  longitude: lastPosition.longitude,
                }}
                title={device?.name || 'Dispositivo'}
                description="Última ubicación del dispositivo"
              >
                <View style={styles.deviceMarker}>
                  <Ionicons name="location" size={24} color="#FF3B30" />
                </View>
              </Marker>

              {/* User Location Marker */}
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Tu ubicación"
                  description="Donde estás ahora"
                >
                  <View style={styles.userMarker}>
                    <View style={styles.userMarkerInner} />
                  </View>
                </Marker>
              )}
            </MapView>
            <View style={styles.mapOverlay}>
              <View style={[styles.mapLegend, { backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
                <View style={styles.legendItem}>
                  <Ionicons name="location" size={16} color="#FF3B30" />
                  <Text style={[styles.legendText, { color: theme.textSecondary }]}>Dispositivo</Text>
                </View>
                {userLocation && (
                  <View style={styles.legendItem}>
                    <View style={[styles.userMarkerSmall]}>
                      <View style={styles.userMarkerSmallInner} />
                    </View>
                    <Text style={[styles.legendText, { color: theme.textSecondary }]}>Tu ubicación</Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        <View style={[styles.content, { backgroundColor: theme.bg }]}>
          {/* Reporting Status Card */}
          {(() => {
            const deviceStatus = getDeviceStatus(device, lastPosition);
            const statusLabels = {
              reporting: 'Reportando GPS',
              connected: 'Conectado',
              offline: 'Sin conexión',
            };
            const statusColors = {
              reporting: '#34C759',
              connected: '#FF9500',
              offline: '#FF3B30',
            };
            return (
              <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                <View style={styles.statusCardContent}>
                  <StatusIndicator status={deviceStatus} />
                  <View style={styles.statusCardInfo}>
                    <Text style={[styles.statusCardTitle, { color: statusColors[deviceStatus] }]}>
                      {statusLabels[deviceStatus]}
                    </Text>
                    <Text style={[styles.statusCardDescription, { color: theme.textSecondary }]}>
                      {deviceStatus === 'reporting' && lastPosition
                        ? `Última posición: ${formatTimeAgoDetailed(new Date(lastPosition.createdAt || lastPosition.timestamp))}`
                        : deviceStatus === 'connected' && device?.batteryUpdatedAt
                        ? `Última señal: ${formatTimeAgoDetailed(new Date(device.batteryUpdatedAt))}`
                        : lastPosition
                        ? `Última posición: ${formatTimeAgoDetailed(new Date(lastPosition.createdAt || lastPosition.timestamp))}`
                        : 'Nunca ha reportado ubicación'
                      }
                    </Text>
                  </View>
                </View>
                {deviceStatus === 'connected' && (
                  <View style={[styles.statusCardWarning, { borderTopColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                    <Ionicons name="information-circle-outline" size={16} color="#FF9500" />
                    <Text style={[styles.statusCardWarningText, { color: theme.textSecondary }]}>
                      El dispositivo está activo pero no envía coordenadas GPS. Puede estar en interior o sin señal GPS.
                    </Text>
                  </View>
                )}
                {deviceStatus === 'offline' && lastPosition && (
                  <View style={[styles.statusCardWarning, { borderTopColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                    <Ionicons name="warning-outline" size={16} color="#FF3B30" />
                    <Text style={[styles.statusCardWarningText, { color: theme.textSecondary }]}>
                      Sin actividad reciente. Verifica que el dispositivo esté encendido y tenga señal.
                    </Text>
                  </View>
                )}
                {!lastPosition && (
                  <View style={[styles.statusCardWarning, { borderTopColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.primary.main} />
                    <Text style={[styles.statusCardWarningText, { color: theme.textSecondary }]}>
                      Asegúrate de que el dispositivo esté encendido y tenga señal GPS
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Battery Status Card */}
          {device.batteryLevel !== null && device.batteryLevel !== undefined && (
            <View style={[
              styles.batteryCard,
              { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' },
              device.batteryLevel <= 20 && (isDark ? { backgroundColor: 'rgba(255, 59, 48, 0.15)', borderColor: '#FF3B30' } : styles.batteryCardLow)
            ]}>
              <View style={styles.batteryCardContent}>
                <View style={[
                  styles.batteryIconContainer,
                  device.batteryLevel <= 20 && (isDark ? { backgroundColor: 'rgba(255, 59, 48, 0.2)' } : styles.batteryIconContainerLow),
                  device.batteryLevel > 20 && device.batteryLevel <= 40 && (isDark ? { backgroundColor: 'rgba(255, 149, 0, 0.2)' } : styles.batteryIconContainerMedium),
                  device.batteryLevel > 40 && (isDark ? { backgroundColor: 'rgba(52, 199, 89, 0.2)' } : styles.batteryIconContainerGood),
                ]}>
                  <Ionicons
                    name={device.batteryLevel <= 20 ? 'battery-dead' : device.batteryLevel <= 50 ? 'battery-half' : 'battery-full'}
                    size={28}
                    color={device.batteryLevel <= 20 ? '#FF3B30' : device.batteryLevel <= 40 ? '#FF9500' : '#34C759'}
                  />
                </View>
                <View style={styles.batteryCardInfo}>
                  <Text style={[
                    styles.batteryCardTitle,
                    device.batteryLevel <= 20 && styles.batteryCardTitleLow,
                    device.batteryLevel > 20 && device.batteryLevel <= 40 && styles.batteryCardTitleMedium,
                    device.batteryLevel > 40 && styles.batteryCardTitleGood,
                  ]}>
                    {device.batteryLevel}% Batería
                  </Text>
                  {device.batteryUpdatedAt && (
                    <Text style={[styles.batteryCardDescription, { color: theme.textSecondary }]}>
                      Actualizado {formatTimeAgoDetailed(new Date(device.batteryUpdatedAt))}
                    </Text>
                  )}
                </View>
              </View>
              {device.batteryLevel <= 20 && (
                <View style={[styles.batteryWarning, { borderTopColor: isDark ? 'rgba(255, 59, 48, 0.3)' : '#FFD5D5' }]}>
                  <Ionicons name="warning-outline" size={16} color="#FF3B30" />
                  <Text style={styles.batteryWarningText}>
                    Batería baja - conecta el cargador pronto
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Alert Section - Prominent */}
          {activeAlert ? (
            <View style={[styles.activeAlertCard, isDark && { backgroundColor: 'rgba(255, 59, 48, 0.15)', borderColor: '#FF3B30' }]}>
              <View style={styles.activeAlertHeader}>
                <View style={[styles.activeAlertIconContainer, isDark && { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                  <Ionicons name="warning" size={28} color="#FF3B30" />
                </View>
                <View style={styles.activeAlertInfo}>
                  <Text style={styles.activeAlertTitle}>
                    {EVENT_TYPES.find((t) => t.value === activeAlert.type)?.label}
                  </Text>
                  <Text style={[styles.activeAlertDescription, { color: theme.text }]} numberOfLines={2}>
                    {activeAlert.description}
                  </Text>
                  <Text style={[styles.activeAlertDate, { color: theme.textSecondary }]}>
                    {new Date(activeAlert.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeAlertButtonNew}
                onPress={handleCloseAlert}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.closeAlertButtonTextNew}>Cerrar Alerta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createAlertCard}
              onPress={() => navigation.navigate('AddEvent', { deviceId: device.id })}
              activeOpacity={0.8}
            >
              <View style={styles.createAlertContent}>
                <View style={styles.createAlertIconContainer}>
                  <Ionicons name="megaphone" size={28} color="#fff" />
                </View>
                <View style={styles.createAlertTextContainer}>
                  <Text style={styles.createAlertTitle}>Crear Alerta</Text>
                  <Text style={styles.createAlertSubtitle}>
                    Reporta un robo, extravío u otra emergencia
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
          )}

          {/* Device Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Información del Dispositivo</Text>

            <Text style={[styles.label, { color: theme.text }]}>IMEI</Text>
            <View style={[styles.infoBox, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>{device.imei}</Text>
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Nombre del Dispositivo</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#2C2C2E' : '#fff', borderColor: isDark ? '#3A3A3C' : '#ddd', color: theme.text }]}
              placeholder="Nombre del dispositivo"
              placeholderTextColor={theme.textSecondary}
              value={deviceName}
              onChangeText={setDeviceName}
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary.main }, saving && styles.saveButtonDisabled]}
              onPress={handleSaveDevice}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* QR Code Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Codigo QR</Text>
            <View style={[styles.qrSectionCard, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
              <View style={styles.qrSectionContent}>
                <View style={[styles.qrIconContainer, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : '#F0F8FF' }]}>
                  <Ionicons name="qr-code" size={32} color={theme.primary.main} />
                </View>
                <View style={styles.qrSectionInfo}>
                  <Text style={[styles.qrSectionTitle, { color: theme.text }]}>
                    {device.qrEnabled ? 'QR activo' : 'QR disponible'}
                  </Text>
                  <Text style={[styles.qrSectionSubtitle, { color: theme.textSecondary }]}>
                    Quien escanee el QR podra contactarte de forma anonima si encuentra tu dispositivo
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.qrButton, { backgroundColor: theme.primary.main }]}
                onPress={() => navigation.navigate('DeviceQR', { deviceId: device.id })}
              >
                <Ionicons name="qr-code-outline" size={20} color="#fff" />
                <Text style={styles.qrButtonText}>Ver codigo QR</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Last Position */}
          {lastPosition && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Última Ubicación</Text>
              <Text style={[styles.positionText, { color: theme.textSecondary }]}>
                Lat: {lastPosition.latitude.toFixed(6)}, Lon: {lastPosition.longitude.toFixed(6)}
              </Text>
              {lastPosition.speed !== null && (
                <Text style={[styles.positionText, { color: theme.textSecondary }]}>
                  Velocidad: {lastPosition.speed.toFixed(1)} km/h
                </Text>
              )}
              <Text style={[styles.positionText, { color: theme.textSecondary }]}>
                {new Date(lastPosition.timestamp).toLocaleString()}
              </Text>
            </View>
          )}

          {/* Lock/Geofence Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Bloqueo de Movimiento</Text>

            {device.isLocked ? (
              <View style={[styles.lockActiveCard, isDark && { backgroundColor: 'rgba(255, 149, 0, 0.15)', borderColor: '#FF9500' }]}>
                <View style={styles.lockActiveHeader}>
                  <Ionicons name="lock-closed" size={24} color="#FF9500" />
                  <View style={styles.lockActiveInfo}>
                    <Text style={styles.lockActiveTitle}>Dispositivo Bloqueado</Text>
                    <Text style={[styles.lockActiveSubtitle, { color: theme.textSecondary }]}>
                      {device.lockRadius === 0
                        ? 'Alerta si hay cualquier movimiento'
                        : `Radio permitido: ${device.lockRadius}m`}
                    </Text>
                    {device.lockedAt && (
                      <Text style={[styles.lockActiveDate, { color: theme.textSecondary }]}>
                        Bloqueado {formatTimeAgoDetailed(new Date(device.lockedAt))}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.unlockButton, lockingDevice && styles.buttonDisabled]}
                  onPress={handleUnlockDevice}
                  disabled={lockingDevice}
                >
                  {lockingDevice ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="lock-open-outline" size={20} color="#fff" />
                      <Text style={styles.unlockButtonText}>Desbloquear</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.lockSetupCard, { backgroundColor: isDark ? '#2C2C2E' : '#F8F9FA', borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                <View style={styles.lockSetupHeader}>
                  <Ionicons name="shield-outline" size={24} color={theme.primary.main} />
                  <Text style={[styles.lockSetupTitle, { color: theme.primary.main }]}>
                    Bloquear en posición actual
                  </Text>
                </View>

                <Text style={[styles.lockSetupDescription, { color: theme.textSecondary }]}>
                  Recibe una notificación si el dispositivo se mueve fuera del radio permitido.
                  Ideal para vehículos estacionados o mascotas.
                </Text>

                <View style={styles.radiusContainer}>
                  <Text style={[styles.radiusLabel, { color: theme.text }]}>Radio de movimiento permitido</Text>
                  <View style={styles.radiusValueContainer}>
                    <Text style={[styles.radiusValue, { color: theme.primary.main }]}>
                      {lockRadius === 0 ? 'Sin movimiento' : `${lockRadius}m`}
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    step={5}
                    value={lockRadius}
                    onValueChange={setLockRadius}
                    minimumTrackTintColor={theme.primary.main}
                    maximumTrackTintColor={isDark ? '#3A3A3C' : '#E5E5EA'}
                    thumbTintColor={theme.primary.main}
                  />
                  <View style={styles.radiusHints}>
                    <Text style={[styles.radiusHint, { color: theme.textSecondary }]}>0m (Vehículo)</Text>
                    <Text style={[styles.radiusHint, { color: theme.textSecondary }]}>100m (Mascota)</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.lockButton, { backgroundColor: theme.primary.main }, (!lastPosition || lockingDevice) && styles.buttonDisabled]}
                  onPress={handleLockDevice}
                  disabled={!lastPosition || lockingDevice}
                >
                  {lockingDevice ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="lock-closed-outline" size={20} color="#fff" />
                      <Text style={styles.lockButtonText}>Bloquear Dispositivo</Text>
                    </>
                  )}
                </TouchableOpacity>

                {!lastPosition && (
                  <Text style={styles.lockWarning}>
                    El dispositivo debe tener una ubicación para poder bloquearlo
                  </Text>
                )}
              </View>
            )}
          </View>


          {/* Alert Modal */}
          {showAlertModal && (
            <View style={styles.modalOverlay}>
              <View style={[styles.modal, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Crear Alerta Urgente</Text>

                <Text style={[styles.label, { color: theme.text }]}>Tipo de Alerta</Text>
                <View style={[styles.pickerContainer, { borderColor: isDark ? '#3A3A3C' : '#ddd', backgroundColor: isDark ? '#2C2C2E' : '#fff' }]}>
                  <Picker
                    selectedValue={alertType}
                    onValueChange={setAlertType}
                    style={{ color: theme.text }}
                  >
                    {EVENT_TYPES.map((type) => (
                      <Picker.Item key={type.value} label={type.label} value={type.value} color={theme.text} />
                    ))}
                  </Picker>
                </View>

                <Text style={[styles.label, { color: theme.text }]}>Descripción</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: isDark ? '#2C2C2E' : '#fff', borderColor: isDark ? '#3A3A3C' : '#ddd', color: theme.text }]}
                  placeholder="Describe la situación..."
                  placeholderTextColor={theme.textSecondary}
                  value={alertDescription}
                  onChangeText={setAlertDescription}
                  multiline
                  numberOfLines={4}
                />

                <View style={[styles.switchContainer, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}>
                  <View style={styles.switchLabel}>
                    <Ionicons name="locate" size={20} color={theme.text} />
                    <Text style={[styles.switchText, { color: theme.text }]}>Rastrear en tiempo real</Text>
                  </View>
                  <Switch
                    value={realTimeTracking}
                    onValueChange={setRealTimeTracking}
                    trackColor={{ false: isDark ? '#3A3A3C' : '#d1d1d1', true: theme.primary.main }}
                    thumbColor="#fff"
                  />
                </View>
                {realTimeTracking && (
                  <Text style={[styles.trackingInfo, { color: theme.textSecondary }]}>
                    Se registrará la ruta del dispositivo cada 30 segundos mientras la alerta esté activa
                  </Text>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? '#3A3A3C' : '#f5f5f5' }]}
                    onPress={() => {
                      setShowAlertModal(false);
                      setAlertDescription('');
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton, creatingAlert && styles.submitButtonDisabled]}
                    onPress={handleCreateAlert}
                    disabled={creatingAlert}
                  >
                    {creatingAlert ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Crear Alerta</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusCardDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  statusCardWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  statusCardWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
    marginTop: 12,
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  positionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activeAlertBox: {
    backgroundColor: '#FFF3F3',
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertType: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
  },
  alertDescription: {
    fontSize: 14,
    color: '#262626',
    marginBottom: 8,
  },
  alertDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  closeAlertButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  closeAlertButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  createAlertButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  createAlertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  qrSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qrSectionInfo: {
    flex: 1,
  },
  qrSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  qrSectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  qrButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#262626',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#FF3B30',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 12,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchText: {
    fontSize: 16,
    color: '#262626',
    fontWeight: '500',
  },
  trackingInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
  // Lock/Geofence styles
  lockActiveCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  lockActiveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  lockActiveInfo: {
    flex: 1,
  },
  lockActiveTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9500',
    marginBottom: 4,
  },
  lockActiveSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  lockActiveDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  unlockButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lockSetupCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  lockSetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  lockSetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  lockSetupDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  radiusContainer: {
    marginBottom: 16,
  },
  radiusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    marginBottom: 8,
  },
  radiusValueContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  radiusValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  radiusHint: {
    fontSize: 12,
    color: '#999',
  },
  lockButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  lockWarning: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 12,
  },
  // Battery styles
  batteryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  batteryCardLow: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF3B30',
  },
  batteryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  batteryIconContainerLow: {
    backgroundColor: '#FFEBEB',
  },
  batteryIconContainerMedium: {
    backgroundColor: '#FFF3E0',
  },
  batteryIconContainerGood: {
    backgroundColor: '#E8F8ED',
  },
  batteryCardInfo: {
    flex: 1,
  },
  batteryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  batteryCardTitleLow: {
    color: '#FF3B30',
  },
  batteryCardTitleMedium: {
    color: '#FF9500',
  },
  batteryCardTitleGood: {
    color: '#34C759',
  },
  batteryCardDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  batteryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFD5D5',
  },
  batteryWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
  },
  // Map styles
  mapContainer: {
    height: MAP_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  mapLegend: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
    alignSelf: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  deviceMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
  },
  userMarkerSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerSmallInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: 'white',
  },
  // New prominent alert styles
  createAlertCard: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createAlertIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  createAlertTextContainer: {
    flex: 1,
  },
  createAlertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  createAlertSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  activeAlertCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  activeAlertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activeAlertIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  activeAlertInfo: {
    flex: 1,
  },
  activeAlertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 4,
  },
  activeAlertDescription: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
    marginBottom: 4,
  },
  activeAlertDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  closeAlertButtonNew: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closeAlertButtonTextNew: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
