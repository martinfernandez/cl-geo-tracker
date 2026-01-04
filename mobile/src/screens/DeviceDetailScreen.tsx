import React, { useState, useEffect, useRef } from 'react';
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
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { deviceApi, eventApi, positionApi, Device } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 200;

// Component for the pulsing status indicator
function StatusIndicator({ isActive, size = 'large' }: { isActive: boolean; size?: 'large' | 'normal' }) {
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
  const color = isActive ? '#34C759' : '#FF3B30';
  const pulseOpacity = isActive ? 0.4 : 0.2;

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

  // Lock/Geofence state
  const [lockRadius, setLockRadius] = useState(0);
  const [lockingDevice, setLockingDevice] = useState(false);

  // User location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

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
      Alert.alert('Error', 'El dispositivo no tiene ubicación disponible para bloquear');
      return;
    }

    try {
      setLockingDevice(true);
      const updatedDevice = await deviceApi.lock(deviceId, lockRadius);
      setDevice(updatedDevice);
      Alert.alert(
        'Dispositivo Bloqueado',
        lockRadius === 0
          ? 'Recibirás una notificación si el dispositivo se mueve.'
          : `Recibirás una notificación si el dispositivo se mueve más de ${lockRadius}m.`
      );
    } catch (error: any) {
      console.error('Error locking device:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo bloquear el dispositivo');
    } finally {
      setLockingDevice(false);
    }
  };

  const handleUnlockDevice = async () => {
    try {
      setLockingDevice(true);
      const updatedDevice = await deviceApi.unlock(deviceId);
      setDevice(updatedDevice);
      Alert.alert('Dispositivo Desbloqueado', 'Ya no recibirás alertas de movimiento.');
    } catch (error: any) {
      console.error('Error unlocking device:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo desbloquear el dispositivo');
    } finally {
      setLockingDevice(false);
    }
  };

  const handleSaveDevice = async () => {
    try {
      setSaving(true);
      await deviceApi.update(deviceId, deviceName);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando dispositivo...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudo cargar el dispositivo</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lastPosition = device.positions?.[0];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Dispositivo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Device Location Map */}
        {lastPosition && (
          <View style={styles.mapContainer}>
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
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <Ionicons name="location" size={16} color="#FF3B30" />
                  <Text style={styles.legendText}>Dispositivo</Text>
                </View>
                {userLocation && (
                  <View style={styles.legendItem}>
                    <View style={[styles.userMarkerSmall]}>
                      <View style={styles.userMarkerSmallInner} />
                    </View>
                    <Text style={styles.legendText}>Tu ubicación</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* Reporting Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusCardContent}>
              <StatusIndicator isActive={isDeviceReporting(lastPosition)} />
              <View style={styles.statusCardInfo}>
                <Text style={[
                  styles.statusCardTitle,
                  isDeviceReporting(lastPosition) ? styles.statusCardTitleActive : styles.statusCardTitleInactive
                ]}>
                  {isDeviceReporting(lastPosition) ? 'Reportando' : 'Sin reporte'}
                </Text>
                <Text style={styles.statusCardDescription}>
                  {lastPosition
                    ? formatTimeAgoDetailed(new Date(lastPosition.createdAt || lastPosition.timestamp))
                    : 'Nunca ha reportado ubicación'
                  }
                </Text>
              </View>
            </View>
            {!isDeviceReporting(lastPosition) && lastPosition && (
              <View style={styles.statusCardWarning}>
                <Ionicons name="warning-outline" size={16} color="#FF9500" />
                <Text style={styles.statusCardWarningText}>
                  El dispositivo no ha enviado ubicación en los últimos 5 minutos
                </Text>
              </View>
            )}
            {!lastPosition && (
              <View style={styles.statusCardWarning}>
                <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
                <Text style={styles.statusCardWarningText}>
                  Asegúrate de que el dispositivo esté encendido y tenga señal GPS
                </Text>
              </View>
            )}
          </View>

          {/* Battery Status Card */}
          {device.batteryLevel !== null && device.batteryLevel !== undefined && (
            <View style={[
              styles.batteryCard,
              device.batteryLevel <= 20 && styles.batteryCardLow
            ]}>
              <View style={styles.batteryCardContent}>
                <View style={[
                  styles.batteryIconContainer,
                  device.batteryLevel <= 20 && styles.batteryIconContainerLow,
                  device.batteryLevel > 20 && device.batteryLevel <= 40 && styles.batteryIconContainerMedium,
                  device.batteryLevel > 40 && styles.batteryIconContainerGood,
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
                    <Text style={styles.batteryCardDescription}>
                      Actualizado {formatTimeAgoDetailed(new Date(device.batteryUpdatedAt))}
                    </Text>
                  )}
                </View>
              </View>
              {device.batteryLevel <= 20 && (
                <View style={styles.batteryWarning}>
                  <Ionicons name="warning-outline" size={16} color="#FF3B30" />
                  <Text style={styles.batteryWarningText}>
                    Batería baja - conecta el cargador pronto
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Device Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Dispositivo</Text>

            <Text style={styles.label}>IMEI</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{device.imei}</Text>
            </View>

            <Text style={styles.label}>Nombre del Dispositivo</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del dispositivo"
              value={deviceName}
              onChangeText={setDeviceName}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
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
            <Text style={styles.sectionTitle}>Codigo QR</Text>
            <View style={styles.qrSectionCard}>
              <View style={styles.qrSectionContent}>
                <View style={styles.qrIconContainer}>
                  <Ionicons name="qr-code" size={32} color="#007AFF" />
                </View>
                <View style={styles.qrSectionInfo}>
                  <Text style={styles.qrSectionTitle}>
                    {device.qrEnabled ? 'QR activo' : 'QR disponible'}
                  </Text>
                  <Text style={styles.qrSectionSubtitle}>
                    Quien escanee el QR podra contactarte de forma anonima si encuentra tu dispositivo
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.qrButton}
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
              <Text style={styles.sectionTitle}>Última Ubicación</Text>
              <Text style={styles.positionText}>
                Lat: {lastPosition.latitude.toFixed(6)}, Lon: {lastPosition.longitude.toFixed(6)}
              </Text>
              {lastPosition.speed !== null && (
                <Text style={styles.positionText}>
                  Velocidad: {lastPosition.speed.toFixed(1)} km/h
                </Text>
              )}
              <Text style={styles.positionText}>
                {new Date(lastPosition.timestamp).toLocaleString()}
              </Text>
            </View>
          )}

          {/* Lock/Geofence Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bloqueo de Movimiento</Text>

            {device.isLocked ? (
              <View style={styles.lockActiveCard}>
                <View style={styles.lockActiveHeader}>
                  <Ionicons name="lock-closed" size={24} color="#FF9500" />
                  <View style={styles.lockActiveInfo}>
                    <Text style={styles.lockActiveTitle}>Dispositivo Bloqueado</Text>
                    <Text style={styles.lockActiveSubtitle}>
                      {device.lockRadius === 0
                        ? 'Alerta si hay cualquier movimiento'
                        : `Radio permitido: ${device.lockRadius}m`}
                    </Text>
                    {device.lockedAt && (
                      <Text style={styles.lockActiveDate}>
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
              <View style={styles.lockSetupCard}>
                <View style={styles.lockSetupHeader}>
                  <Ionicons name="shield-outline" size={24} color="#007AFF" />
                  <Text style={styles.lockSetupTitle}>
                    Bloquear en posición actual
                  </Text>
                </View>

                <Text style={styles.lockSetupDescription}>
                  Recibe una notificación si el dispositivo se mueve fuera del radio permitido.
                  Ideal para vehículos estacionados o mascotas.
                </Text>

                <View style={styles.radiusContainer}>
                  <Text style={styles.radiusLabel}>Radio de movimiento permitido</Text>
                  <View style={styles.radiusValueContainer}>
                    <Text style={styles.radiusValue}>
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
                    minimumTrackTintColor="#007AFF"
                    maximumTrackTintColor="#E5E5EA"
                    thumbTintColor="#007AFF"
                  />
                  <View style={styles.radiusHints}>
                    <Text style={styles.radiusHint}>0m (Vehículo)</Text>
                    <Text style={styles.radiusHint}>100m (Mascota)</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.lockButton, (!lastPosition || lockingDevice) && styles.buttonDisabled]}
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

          {/* Active Alert */}
          {activeAlert ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alerta Activa</Text>
              <View style={styles.activeAlertBox}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning" size={24} color="#FF3B30" />
                  <Text style={styles.alertType}>
                    {EVENT_TYPES.find((t) => t.value === activeAlert.type)?.label}
                  </Text>
                </View>
                <Text style={styles.alertDescription}>{activeAlert.description}</Text>
                <Text style={styles.alertDate}>
                  {new Date(activeAlert.createdAt).toLocaleString()}
                </Text>
                <TouchableOpacity
                  style={styles.closeAlertButton}
                  onPress={handleCloseAlert}
                >
                  <Text style={styles.closeAlertButtonText}>Cerrar Alerta</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alertas Urgentes</Text>
              <Text style={styles.infoText}>
                No hay alertas activas para este dispositivo.
              </Text>
              <TouchableOpacity
                style={styles.createAlertButton}
                onPress={() => setShowAlertModal(true)}
              >
                <Ionicons name="alert-circle" size={24} color="#fff" />
                <Text style={styles.createAlertButtonText}>Crear Alerta Urgente</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Alert Modal */}
          {showAlertModal && (
            <View style={styles.modalOverlay}>
              <View style={styles.modal}>
                <Text style={styles.modalTitle}>Crear Alerta Urgente</Text>

                <Text style={styles.label}>Tipo de Alerta</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={alertType}
                    onValueChange={setAlertType}
                  >
                    {EVENT_TYPES.map((type) => (
                      <Picker.Item key={type.value} label={type.label} value={type.value} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe la situación..."
                  value={alertDescription}
                  onChangeText={setAlertDescription}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.switchContainer}>
                  <View style={styles.switchLabel}>
                    <Ionicons name="locate" size={20} color="#262626" />
                    <Text style={styles.switchText}>Rastrear en tiempo real</Text>
                  </View>
                  <Switch
                    value={realTimeTracking}
                    onValueChange={setRealTimeTracking}
                    trackColor={{ false: '#d1d1d1', true: '#007AFF' }}
                    thumbColor="#fff"
                  />
                </View>
                {realTimeTracking && (
                  <Text style={styles.trackingInfo}>
                    Se registrará la ruta del dispositivo cada 30 segundos mientras la alerta esté activa
                  </Text>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAlertModal(false);
                      setAlertDescription('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
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
  statusCardTitleActive: {
    color: '#34C759',
  },
  statusCardTitleInactive: {
    color: '#FF3B30',
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
});
