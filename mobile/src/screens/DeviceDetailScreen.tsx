import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { deviceApi, eventApi, positionApi } from '../services/api';
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
  const [device, setDevice] = useState<any>(null);
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertType, setAlertType] = useState('THEFT');
  const [alertDescription, setAlertDescription] = useState('');
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [realTimeTracking, setRealTimeTracking] = useState(false);

  useEffect(() => {
    loadDevice();
  }, [deviceId]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      const deviceData = await deviceApi.getById(deviceId);
      setDevice(deviceData);
      setDeviceName(deviceData.name || '');

      // Check for active urgent alerts for this device
      if (deviceData.events) {
        const urgentAlert = deviceData.events.find(
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
        <View style={styles.content}>
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
});
