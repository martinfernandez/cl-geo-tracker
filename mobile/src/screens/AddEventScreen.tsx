import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { eventApi, deviceApi } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapLocationPicker from '../components/MapLocationPicker';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../contexts/ToastContext';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const EVENT_TYPES = [
  { label: 'Robo', value: 'THEFT', icon: 'warning', color: '#FF3B30' },
  { label: 'Extravío', value: 'LOST', icon: 'help-circle', color: '#FF9500' },
  { label: 'Accidente', value: 'ACCIDENT', icon: 'car', color: '#FFCC00' },
  { label: 'Incendio', value: 'FIRE', icon: 'flame', color: '#FF2D55' },
];

const STEPS = {
  TYPE: 0,
  DESCRIPTION: 1,
  LOCATION: 2,
  DEVICE: 3,
  IMAGE: 4,
  REVIEW: 5,
};

export default function AddEventScreen({ navigation }: Props) {
  const { showSuccess, showError } = useToast();
  const [currentStep, setCurrentStep] = useState(STEPS.TYPE);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [eventType, setEventType] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationMode, setLocationMode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    loadDevices();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await Location.requestForegroundPermissionsAsync();
  };

  const loadDevices = async () => {
    try {
      const data = await deviceApi.getAll();
      setDevices(data);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLocationMode('current');
      setCurrentStep(STEPS.DEVICE);
    } catch (error) {
      console.error('Error getting location:', error);
      showError('No se pudo obtener la ubicación');
    } finally {
      setLoadingLocation(false);
    }
  };

  const getDeviceLocation = async () => {
    if (!selectedDevice) {
      showError('Selecciona un dispositivo primero');
      return;
    }

    setLoadingLocation(true);
    try {
      const device = await deviceApi.getById(selectedDevice);
      if (device.positions && device.positions.length > 0) {
        const lastPosition = device.positions[0];
        setLocation({
          latitude: lastPosition.latitude,
          longitude: lastPosition.longitude,
        });
        setLocationMode('device');
        setCurrentStep(STEPS.DEVICE);
      } else {
        showError('El dispositivo no tiene ubicaciones registradas');
      }
    } catch (error) {
      console.error('Error getting device location:', error);
      showError('No se pudo obtener la ubicación del dispositivo');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleManualLocation = (loc: { latitude: number; longitude: number }) => {
    setLocation(loc);
    setLocationMode('manual');
    setCurrentStep(STEPS.DEVICE);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!eventType || !description || !location) {
      showError('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      let imageUrl;
      if (imageUri) {
        imageUrl = await eventApi.uploadImage(imageUri);
      }

      const eventData: any = {
        type: eventType,
        description,
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl,
      };

      if (selectedDevice) {
        eventData.deviceId = selectedDevice;
      }

      await eventApi.create(eventData);

      // Show success toast
      showSuccess('Evento creado exitosamente');

      // Navigate to Events list with refresh parameter
      setTimeout(() => {
        navigation.navigate('EventsList', { refresh: true });
      }, 500);
    } catch (error: any) {
      console.error('Error creating event:', error);
      showError(error.response?.data?.error || 'No se pudo crear el evento');
    } finally {
      setLoading(false);
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case STEPS.TYPE:
        return eventType !== '';
      case STEPS.DESCRIPTION:
        return description.trim() !== '';
      case STEPS.LOCATION:
        return location !== null;
      case STEPS.DEVICE:
        return true; // Device is optional
      case STEPS.IMAGE:
        return true; // Image is optional
      default:
        return true;
    }
  };

  const getSelectedEventType = () => {
    return EVENT_TYPES.find(t => t.value === eventType);
  };

  const renderStepIndicator = () => {
    const totalSteps = 6;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    return (
      <View style={styles.stepIndicatorContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepText}>
          Paso {currentStep + 1} de {totalSteps}
        </Text>
      </View>
    );
  };

  const renderStepType = () => {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>¿Qué tipo de evento deseas reportar?</Text>
          <Text style={styles.stepSubtitle}>Selecciona el tipo que mejor describe la situación</Text>
        </View>

        <View style={styles.eventTypesGrid}>
          {EVENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.eventTypeCard,
                eventType === type.value && styles.eventTypeCardSelected,
                { borderColor: eventType === type.value ? type.color : '#e0e0e0' },
              ]}
              onPress={() => setEventType(type.value)}
            >
              <View style={[styles.eventTypeIcon, { backgroundColor: type.color + '20' }]}>
                <Ionicons name={type.icon as any} size={32} color={type.color} />
              </View>
              <Text
                style={[
                  styles.eventTypeLabel,
                  eventType === type.value && { color: type.color },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderStepDescription = () => {
    const selectedType = getSelectedEventType();
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.selectedTypeBadge}>
            <Ionicons name={selectedType?.icon as any} size={20} color={selectedType?.color} />
            <Text style={[styles.selectedTypeText, { color: selectedType?.color }]}>
              {selectedType?.label}
            </Text>
          </View>
          <Text style={styles.stepTitle}>Describe lo que sucedió</Text>
          <Text style={styles.stepSubtitle}>Proporciona detalles que puedan ser útiles</Text>
        </View>

        <TextInput
          style={styles.descriptionInput}
          placeholder="Ej: Se llevaron mi bicicleta del estacionamiento del edificio..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCounter}>{description.length}/500</Text>
      </View>
    );
  };

  const renderStepLocation = () => {
    const selectedType = getSelectedEventType();
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.selectedTypeBadge}>
            <Ionicons name={selectedType?.icon as any} size={20} color={selectedType?.color} />
            <Text style={[styles.selectedTypeText, { color: selectedType?.color }]}>
              {selectedType?.label}
            </Text>
          </View>
          <Text style={styles.stepTitle}>¿Dónde ocurrió?</Text>
          <Text style={styles.stepSubtitle}>Selecciona la ubicación del evento</Text>
        </View>

        {location && (
          <View style={styles.locationSelectedCard}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <View style={styles.locationSelectedInfo}>
              <Text style={styles.locationSelectedTitle}>Ubicación confirmada</Text>
              <Text style={styles.locationSelectedCoords}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationSelectedMode}>
                {locationMode === 'current' && 'Ubicación actual'}
                {locationMode === 'device' && 'Ubicación del dispositivo'}
                {locationMode === 'manual' && 'Selección manual en mapa'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.locationOptionsGrid}>
          <TouchableOpacity
            style={styles.locationOption}
            onPress={getCurrentLocation}
            disabled={loadingLocation}
          >
            <View style={styles.locationOptionIcon}>
              {loadingLocation && !location ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Ionicons name="navigate" size={28} color="#007AFF" />
              )}
            </View>
            <Text style={styles.locationOptionTitle}>Mi Ubicación</Text>
            <Text style={styles.locationOptionSubtitle}>Usar GPS actual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationOption}
            onPress={() => setShowMapPicker(true)}
          >
            <View style={styles.locationOptionIcon}>
              <Ionicons name="map" size={28} color="#007AFF" />
            </View>
            <Text style={styles.locationOptionTitle}>Seleccionar</Text>
            <Text style={styles.locationOptionSubtitle}>En el mapa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStepDevice = () => {
    const selectedType = getSelectedEventType();
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.selectedTypeBadge}>
            <Ionicons name={selectedType?.icon as any} size={20} color={selectedType?.color} />
            <Text style={[styles.selectedTypeText, { color: selectedType?.color }]}>
              {selectedType?.label}
            </Text>
          </View>
          <Text style={styles.stepTitle}>¿Está asociado a un dispositivo?</Text>
          <Text style={styles.stepSubtitle}>Opcional - Puedes vincular un dispositivo rastreado</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.deviceOption,
            selectedDevice === '' && styles.deviceOptionSelected,
          ]}
          onPress={() => setSelectedDevice('')}
        >
          <Ionicons
            name={selectedDevice === '' ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={selectedDevice === '' ? '#007AFF' : '#999'}
          />
          <View style={styles.deviceOptionInfo}>
            <Text style={styles.deviceOptionTitle}>Sin dispositivo</Text>
            <Text style={styles.deviceOptionSubtitle}>No vincular a ningún dispositivo</Text>
          </View>
        </TouchableOpacity>

        {devices.map((device) => (
          <TouchableOpacity
            key={device.id}
            style={[
              styles.deviceOption,
              selectedDevice === device.id && styles.deviceOptionSelected,
            ]}
            onPress={() => setSelectedDevice(device.id)}
          >
            <Ionicons
              name={selectedDevice === device.id ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={selectedDevice === device.id ? '#007AFF' : '#999'}
            />
            <View style={styles.deviceOptionInfo}>
              <Text style={styles.deviceOptionTitle}>{device.name || device.imei}</Text>
              <Text style={styles.deviceOptionSubtitle}>
                {device.positions?.length > 0
                  ? `Última ubicación: ${new Date(device.positions[0].createdAt).toLocaleString()}`
                  : 'Sin ubicaciones registradas'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {devices.length === 0 && (
          <View style={styles.emptyDevicesCard}>
            <Ionicons name="information-circle-outline" size={48} color="#999" />
            <Text style={styles.emptyDevicesText}>No tienes dispositivos registrados</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStepImage = () => {
    const selectedType = getSelectedEventType();
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.selectedTypeBadge}>
            <Ionicons name={selectedType?.icon as any} size={20} color={selectedType?.color} />
            <Text style={[styles.selectedTypeText, { color: selectedType?.color }]}>
              {selectedType?.label}
            </Text>
          </View>
          <Text style={styles.stepTitle}>¿Tienes una foto?</Text>
          <Text style={styles.stepSubtitle}>Opcional - Agrega evidencia visual del evento</Text>
        </View>

        {imageUri ? (
          <View style={styles.imagePreviewCard}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImageUri(null)}
            >
              <Ionicons name="close-circle" size={32} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageOptionsGrid}>
            <TouchableOpacity style={styles.imageOption} onPress={takePhoto}>
              <View style={styles.imageOptionIcon}>
                <Ionicons name="camera" size={32} color="#007AFF" />
              </View>
              <Text style={styles.imageOptionTitle}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageOption} onPress={pickImage}>
              <View style={styles.imageOptionIcon}>
                <Ionicons name="images" size={32} color="#007AFF" />
              </View>
              <Text style={styles.imageOptionTitle}>Galería</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderStepReview = () => {
    const selectedType = getSelectedEventType();
    const selectedDeviceName = selectedDevice
      ? devices.find(d => d.id === selectedDevice)?.name || 'Dispositivo seleccionado'
      : 'Sin dispositivo';

    return (
      <ScrollView style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Revisa los detalles</Text>
          <Text style={styles.stepSubtitle}>Verifica que todo esté correcto antes de crear el evento</Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Tipo de Evento</Text>
          <View style={[styles.reviewCard, { borderLeftColor: selectedType?.color }]}>
            <Ionicons name={selectedType?.icon as any} size={24} color={selectedType?.color} />
            <Text style={styles.reviewCardText}>{selectedType?.label}</Text>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Descripción</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewCardText}>{description}</Text>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Ubicación</Text>
          <View style={styles.reviewCard}>
            <Ionicons name="location" size={24} color="#007AFF" />
            <View style={styles.reviewCardInfo}>
              <Text style={styles.reviewCardText}>
                {location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)}
              </Text>
              <Text style={styles.reviewCardSubtext}>
                {locationMode === 'current' && 'Ubicación actual'}
                {locationMode === 'device' && 'Ubicación del dispositivo'}
                {locationMode === 'manual' && 'Selección manual'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Dispositivo</Text>
          <View style={styles.reviewCard}>
            <Ionicons name="hardware-chip" size={24} color="#007AFF" />
            <Text style={styles.reviewCardText}>{selectedDeviceName}</Text>
          </View>
        </View>

        {imageUri && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Imagen</Text>
            <Image source={{ uri: imageUri }} style={styles.reviewImage} />
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (currentStep > 0) {
              setCurrentStep(currentStep - 1);
            } else {
              Alert.alert(
                'Cancelar creación',
                '¿Estás seguro que deseas cancelar?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Sí, cancelar', onPress: () => navigation.goBack(), style: 'destructive' },
                ]
              );
            }
          }}
          style={styles.headerButton}
        >
          <Ionicons name={currentStep > 0 ? 'arrow-back' : 'close'} size={28} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Evento</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderStepIndicator()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {currentStep === STEPS.TYPE && renderStepType()}
        {currentStep === STEPS.DESCRIPTION && renderStepDescription()}
        {currentStep === STEPS.LOCATION && renderStepLocation()}
        {currentStep === STEPS.DEVICE && renderStepDevice()}
        {currentStep === STEPS.IMAGE && renderStepImage()}
        {currentStep === STEPS.REVIEW && renderStepReview()}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {currentStep === STEPS.REVIEW ? (
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Crear Evento</Text>
                <Ionicons name="checkmark" size={24} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.continueButton, !canContinue() && styles.continueButtonDisabled]}
            onPress={() => setCurrentStep(currentStep + 1)}
            disabled={!canContinue()}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <MapLocationPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectLocation={handleManualLocation}
        initialLocation={location || undefined}
      />
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
    width: 44,
  },
  stepIndicatorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f9f9f9',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  stepText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventTypeCard: {
    width: '48%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  eventTypeCardSelected: {
    backgroundColor: '#f0f9ff',
  },
  eventTypeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  eventTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  selectedTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    marginBottom: 16,
  },
  selectedTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#262626',
    minHeight: 160,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  charCounter: {
    fontSize: 13,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  locationSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34C759',
    marginBottom: 20,
  },
  locationSelectedInfo: {
    flex: 1,
  },
  locationSelectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  locationSelectedCoords: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  locationSelectedMode: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  locationOptionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  locationOption: {
    flex: 1,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  locationOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  locationOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  locationOptionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  deviceOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f9ff',
  },
  deviceOptionInfo: {
    flex: 1,
  },
  deviceOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  deviceOptionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  emptyDevicesCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyDevicesText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
  imageOptionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  imageOption: {
    flex: 1,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
  },
  imageOptionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imageOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  imagePreviewCard: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  reviewCardInfo: {
    flex: 1,
  },
  reviewCardText: {
    fontSize: 16,
    color: '#262626',
    lineHeight: 22,
  },
  reviewCardSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
