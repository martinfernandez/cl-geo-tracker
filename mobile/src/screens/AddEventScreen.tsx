import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { eventApi, deviceApi, groupApi, phoneLocationApi } from '../services/api';
import { startBackgroundTracking } from '../services/backgroundLocation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import MapLocationPicker from '../components/MapLocationPicker';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EVENT_TYPES = [
  { value: 'GENERAL', icon: 'megaphone-outline', label: 'General', color: '#007AFF' },
  { value: 'THEFT', icon: 'warning-outline', label: 'Robo', color: '#FF3B30' },
  { value: 'LOST', icon: 'search-outline', label: 'Extravio', color: '#FF9500' },
  { value: 'ACCIDENT', icon: 'car-outline', label: 'Accidente', color: '#FF6B00' },
  { value: 'FIRE', icon: 'flame-outline', label: 'Incendio', color: '#FF2D55' },
];

export default function AddEventScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const { isDark } = useTheme();

  // Step state: 0 = details, 1 = location (type selection is inline now)
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Form state - GENERAL preselected
  const [eventType, setEventType] = useState('GENERAL');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Optional: Device and Group
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [phoneDevice, setPhoneDevice] = useState<any>(null);
  const [usePhoneDevice, setUsePhoneDevice] = useState(false);
  const [adminGroups, setAdminGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [realTimeTracking, setRealTimeTracking] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Reset form
      setCurrentStep(0);
      setEventType('GENERAL');
      setDescription('');
      setImageUri(null);
      setLocation(null);
      setSelectedDevice('');
      setUsePhoneDevice(false);
      setSelectedGroup(null);
      setIsPublic(true);
      setRealTimeTracking(false);
      setDeviceLocation(null);
      setIsUrgent(false);
      slideAnim.setValue(0);

      // Load data
      loadDevices();
      loadAdminGroups();
      loadPhoneDevice();
    }, [])
  );

  useEffect(() => {
    requestPermissions();
  }, []);

  // Get location when entering step 1
  useEffect(() => {
    if (currentStep === 1 && !location) {
      getCurrentLocation();
    }
  }, [currentStep]);

  const requestPermissions = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await Location.requestForegroundPermissionsAsync();
  };

  const loadDevices = async () => {
    try {
      const data = await deviceApi.getAll();
      setDevices(data);

      // If no GPS tracker devices, default to phone device
      const gpsTrackers = data.filter((d: any) => d.type === 'GPS_TRACKER');
      if (gpsTrackers.length === 0) {
        setUsePhoneDevice(true);
        setRealTimeTracking(true);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      // On error loading devices, also default to phone device
      setUsePhoneDevice(true);
      setRealTimeTracking(true);
    }
  };

  const loadAdminGroups = async () => {
    try {
      const data = await groupApi.getMyAdminGroups();
      setAdminGroups(data);
    } catch (error) {
      console.error('Error loading admin groups:', error);
    }
  };

  const loadPhoneDevice = async () => {
    try {
      const status = await phoneLocationApi.getStatus();
      if (status.hasDevice) {
        // Get the phone device details
        const device = await phoneLocationApi.getMyDevice();
        setPhoneDevice(device);
      } else {
        // Create a phone device for the user
        const device = await phoneLocationApi.createDevice('Mi Telefono');
        setPhoneDevice(device);
      }
    } catch (error) {
      console.error('Error loading phone device:', error);
      // Try to create one if getting status fails
      try {
        const device = await phoneLocationApi.createDevice('Mi Telefono');
        setPhoneDevice(device);
      } catch (createError) {
        console.error('Error creating phone device:', createError);
      }
    }
  };

  const loadDeviceLocation = async (deviceId: string) => {
    try {
      const device = devices.find(d => d.id === deviceId);
      if (device?.lastPosition) {
        setDeviceLocation({
          latitude: device.lastPosition.latitude,
          longitude: device.lastPosition.longitude,
        });
        // When real-time tracking, use device location
        setLocation({
          latitude: device.lastPosition.latitude,
          longitude: device.lastPosition.longitude,
        });
      }
    } catch (error) {
      console.error('Error loading device location:', error);
    }
  };

  // When device changes and real-time tracking is enabled, get device location
  useEffect(() => {
    if (selectedDevice && realTimeTracking) {
      loadDeviceLocation(selectedDevice);
    }
  }, [selectedDevice, realTimeTracking]);

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
    if (!deviceId) {
      setRealTimeTracking(false);
      setDeviceLocation(null);
    }
  };

  const handleRealTimeToggle = (enabled: boolean) => {
    setRealTimeTracking(enabled);
    if (enabled && selectedDevice) {
      loadDeviceLocation(selectedDevice);
    } else if (!enabled) {
      setDeviceLocation(null);
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
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const animateToStep = (step: number) => {
    Animated.spring(slideAnim, {
      toValue: -step * SCREEN_WIDTH,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setCurrentStep(step);
  };

  const handleNextFromDetails = () => {
    if (!description.trim()) {
      showError('Describe que esta pasando');
      return;
    }
    animateToStep(1);
  };

  const handleManualLocation = (loc: { latitude: number; longitude: number }) => {
    setLocation(loc);
    setShowMapPicker(false);
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
    if (!location) {
      showError('Esperando ubicacion...');
      return;
    }

    setLoading(true);
    try {
      let imageUrl;
      if (imageUri) {
        console.log('[AddEvent] Uploading image...');
        try {
          imageUrl = await eventApi.uploadImage(imageUri);
          console.log('[AddEvent] Image uploaded:', imageUrl);
        } catch (uploadError: any) {
          console.error('[AddEvent] Image upload failed:', uploadError);
          console.error('[AddEvent] Upload error response:', uploadError.response?.data);
          // Continue without image if upload fails
          imageUrl = undefined;
        }
      }

      const eventData: any = {
        type: eventType,
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl,
        isUrgent,
      };

      if (selectedDevice) {
        eventData.deviceId = selectedDevice;
        eventData.realTimeTracking = realTimeTracking;
      } else if (usePhoneDevice && phoneDevice) {
        eventData.phoneDeviceId = phoneDevice.id;
        eventData.realTimeTracking = realTimeTracking;
      }

      if (selectedGroup) {
        eventData.groupId = selectedGroup;
        eventData.isPublic = isPublic;
      }

      console.log('[AddEvent] Creating event with data:', JSON.stringify(eventData, null, 2));
      await eventApi.create(eventData);

      // Start background tracking if using phone device with real-time tracking
      if (usePhoneDevice && realTimeTracking) {
        console.log('[AddEvent] Starting background location tracking for phone event...');
        const trackingStarted = await startBackgroundTracking();
        if (trackingStarted) {
          console.log('[AddEvent] Background tracking started successfully');
          showSuccess('Evento publicado - tracking activo');
        } else {
          console.warn('[AddEvent] Background tracking could not start');
          showSuccess('Evento publicado');
        }
      } else {
        showSuccess('Evento publicado');
      }

      setTimeout(() => {
        navigation.navigate('EventsList', { refresh: true });
      }, 300);
    } catch (error: any) {
      console.error('[AddEvent] Error creating event:', error);
      console.error('[AddEvent] Error response:', error.response?.data);
      console.error('[AddEvent] Error status:', error.response?.status);
      showError(error.response?.data?.error || 'No se pudo crear el evento');
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeConfig = EVENT_TYPES.find(t => t.value === eventType);

  const renderDetailsStep = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.stepContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Event Type Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tipo de evento</Text>
        <View style={styles.typeSelector}>
          {EVENT_TYPES.map(type => {
            const isSelected = eventType === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  isSelected && { backgroundColor: type.color },
                ]}
                onPress={() => setEventType(type.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={type.icon as any}
                  size={18}
                  color={isSelected ? '#fff' : type.color}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    isSelected && styles.typeChipTextSelected,
                    !isSelected && { color: type.color },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Urgent Toggle */}
        <TouchableOpacity
          style={[styles.urgentToggle, isUrgent && styles.urgentToggleActive]}
          onPress={() => setIsUrgent(!isUrgent)}
        >
          <View style={styles.urgentToggleLeft}>
            <Ionicons
              name={isUrgent ? "alert-circle" : "alert-circle-outline"}
              size={20}
              color={isUrgent ? '#FF3B30' : '#666'}
            />
            <View>
              <Text style={[styles.urgentToggleText, isUrgent && styles.urgentToggleTextActive]}>
                Marcar como urgente
              </Text>
              <Text style={styles.urgentToggleHint}>
                {isUrgent ? 'Se mostrara con indicador pulsante' : 'Mayor visibilidad en el feed'}
              </Text>
            </View>
          </View>
          <View style={[styles.toggleSwitch, isUrgent && styles.urgentToggleSwitchActive]}>
            <View style={[styles.toggleKnob, isUrgent && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Device Selection - Modern Card Design */}
      <View style={styles.deviceSection}>
        <Text style={styles.sectionLabel}>Seguimiento en vivo</Text>

        {/* Device List */}
        <View style={styles.deviceList}>
          {/* No tracking option */}
          <TouchableOpacity
            style={styles.deviceRow}
            onPress={async () => {
              handleDeviceSelect('');
              setUsePhoneDevice(false);
              setRealTimeTracking(false);
              // Get current location and show map picker for easy selection
              if (!location) {
                setLoadingLocation(true);
                try {
                  const loc = await Location.getCurrentPositionAsync({});
                  setLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                  });
                } catch (error) {
                  console.error('Error getting location:', error);
                }
                setLoadingLocation(false);
              }
              setShowMapPicker(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.deviceRowIcon, { backgroundColor: '#F0F0F0' }]}>
              <Ionicons name="location-outline" size={22} color="#8E8E93" />
            </View>
            <View style={styles.deviceRowContent}>
              <Text style={styles.deviceRowTitle}>Solo ubicacion inicial</Text>
              <Text style={styles.deviceRowSubtitle}>Elegir ubicacion en el mapa</Text>
            </View>
            <View style={[styles.radioOuter, !selectedDevice && !usePhoneDevice && styles.radioOuterSelected]}>
              {!selectedDevice && !usePhoneDevice && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Phone Device */}
          {phoneDevice && (
            <TouchableOpacity
              style={styles.deviceRow}
              onPress={() => {
                handleDeviceSelect('');
                setUsePhoneDevice(true);
                setRealTimeTracking(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.deviceRowIcon, { backgroundColor: '#EDE7F6' }]}>
                <Ionicons name="phone-portrait" size={22} color="#5856D6" />
              </View>
              <View style={styles.deviceRowContent}>
                <Text style={styles.deviceRowTitle}>Este iPhone</Text>
                <Text style={styles.deviceRowSubtitle}>Compartir ubicacion en tiempo real</Text>
              </View>
              <View style={[styles.radioOuter, usePhoneDevice && styles.radioOuterSelected]}>
                {usePhoneDevice && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          )}

          {/* GPS Tracker Devices */}
          {devices.filter(d => d.type === 'GPS_TRACKER').map(device => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceRow}
              onPress={() => {
                handleDeviceSelect(device.id);
                setUsePhoneDevice(false);
                setRealTimeTracking(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.deviceRowIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="navigate" size={22} color="#007AFF" />
              </View>
              <View style={styles.deviceRowContent}>
                <Text style={styles.deviceRowTitle}>{device.name || `JX10-${device.imei?.slice(-4)}`}</Text>
                <Text style={styles.deviceRowSubtitle}>Rastreador GPS</Text>
              </View>
              <View style={[styles.radioOuter, selectedDevice === device.id && styles.radioOuterSelected]}>
                {selectedDevice === device.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Real-time tracking info when device selected */}
        {(selectedDevice || usePhoneDevice) && (
          <View style={styles.trackingInfo}>
            <Ionicons name="radio" size={16} color="#34C759" />
            <Text style={styles.trackingInfoText}>
              {usePhoneDevice
                ? 'Tu ubicacion se compartira en tiempo real mientras el evento este activo'
                : 'La ubicacion del dispositivo se actualizara automaticamente'}
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Descripcion</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Que esta pasando? Describe la situacion..."
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
          <Text style={styles.charCounter}>{description.length}/500</Text>
        </View>
      </View>

      {/* Photo */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Foto (opcional)</Text>
        {imageUri ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => setImageUri(null)}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={24} color="#007AFF" />
              <Text style={styles.photoBtnText}>Camara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
              <Ionicons name="images-outline" size={24} color="#007AFF" />
              <Text style={styles.photoBtnText}>Galeria</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Group (if available) */}
      {adminGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Publicar en</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.optionChip, !selectedGroup && styles.optionChipSelected]}
              onPress={() => { setSelectedGroup(null); setIsPublic(true); }}
            >
              <Ionicons name="globe-outline" size={16} color={!selectedGroup ? '#fff' : '#666'} />
              <Text style={[styles.optionChipText, !selectedGroup && styles.optionChipTextSelected]}>
                Publico
              </Text>
            </TouchableOpacity>
            {adminGroups.map(group => (
              <TouchableOpacity
                key={group.id}
                style={[styles.optionChip, selectedGroup === group.id && styles.optionChipSelected]}
                onPress={() => { setSelectedGroup(group.id); setIsPublic(false); }}
              >
                <Ionicons name="people-outline" size={16} color={selectedGroup === group.id ? '#fff' : '#666'} />
                <Text style={[styles.optionChipText, selectedGroup === group.id && styles.optionChipTextSelected]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Spacer for bottom button */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.locationStepContent}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => animateToStep(0)}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <Text style={styles.locationCardTitle}>Ubicacion del evento</Text>

          {loadingLocation ? (
            <View style={styles.locationStatus}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.locationStatusText}>Obteniendo ubicacion...</Text>
            </View>
          ) : location ? (
            <View style={styles.locationWithMap}>
              {/* Mini Map Preview */}
              <View style={styles.miniMapContainer}>
                <MapView
                  style={styles.miniMap}
                  region={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  userInterfaceStyle={isDark ? 'dark' : 'light'}
                  pitchEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                    }}
                  >
                    <View style={[styles.markerContainer, { backgroundColor: selectedTypeConfig?.color || '#007AFF' }]}>
                      <Ionicons name={selectedTypeConfig?.icon as any || 'megaphone-outline'} size={16} color="#fff" />
                    </View>
                  </Marker>
                </MapView>
                <View style={[styles.locationBadge, realTimeTracking && styles.locationBadgeDevice, usePhoneDevice && realTimeTracking && styles.locationBadgePhone]}>
                  <Ionicons
                    name={realTimeTracking ? (usePhoneDevice ? "phone-portrait" : "radio") : "checkmark-circle"}
                    size={16}
                    color={realTimeTracking ? (usePhoneDevice ? '#5856D6' : '#007AFF') : '#34C759'}
                  />
                  <Text style={[styles.locationBadgeText, realTimeTracking && styles.locationBadgeTextDevice, usePhoneDevice && realTimeTracking && styles.locationBadgeTextPhone]}>
                    {realTimeTracking
                      ? (usePhoneDevice ? 'Desde este telefono' : 'Desde dispositivo GPS')
                      : 'Ubicacion lista'}
                  </Text>
                </View>
              </View>
              {/* Only show change location button if NOT using real-time tracking */}
              {!realTimeTracking ? (
                <TouchableOpacity
                  style={styles.changeLocationBtn}
                  onPress={() => setShowMapPicker(true)}
                >
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                  <Text style={styles.changeLocationText}>Cambiar ubicacion</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.trackingInfoBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
                  <Text style={styles.trackingInfoText}>
                    La ubicacion se obtiene del dispositivo GPS en tiempo real
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.locationStatus}>
              <Ionicons name="location-outline" size={48} color="#FF3B30" />
              <Text style={styles.locationErrorText}>No se pudo obtener</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={getCurrentLocation}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMapPicker(true)}>
                <Text style={styles.manualLocationText}>Seleccionar en mapa</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen</Text>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryTypeBadge, { backgroundColor: selectedTypeConfig?.color || '#007AFF' }]}>
              <Ionicons name={selectedTypeConfig?.icon as any || 'megaphone-outline'} size={16} color="#fff" />
              <Text style={styles.summaryTypeText}>{selectedTypeConfig?.label || 'General'}</Text>
            </View>
          </View>
          <Text style={styles.summaryDescription} numberOfLines={2}>{description}</Text>
          {imageUri && (
            <View style={styles.summaryImageBadge}>
              <Ionicons name="image" size={14} color="#34C759" />
              <Text style={styles.summaryImageText}>Imagen adjunta</Text>
            </View>
          )}
        </View>
      </View>

      {/* Publish Button */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.publishBtn, (!location || loading) && styles.publishBtnDisabled]}
          onPress={handleSubmit}
          disabled={!location || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.publishBtnText}>Publicar evento</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Nuevo Evento</Text>
        <View style={styles.headerSide}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, currentStep >= 0 && styles.stepDotActive]} />
            <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]} />
          </View>
        </View>
      </View>

      {/* Steps Container */}
      <Animated.View
        style={[
          styles.stepsWrapper,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {renderDetailsStep()}
        {renderLocationStep()}
      </Animated.View>

      {/* Continue Button (only on step 0) */}
      {currentStep === 0 && (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.continueBtn, !description.trim() && styles.continueBtnDisabled]}
            onPress={handleNextFromDetails}
            disabled={!description.trim()}
          >
            <Text style={styles.continueBtnText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Map Picker */}
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
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerSide: {
    width: 60,
  },
  headerButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
  },
  stepsWrapper: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2,
    flex: 1,
  },
  stepContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 6,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  descriptionInput: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1C1E',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  photoBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  imagePreview: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: {
    flexDirection: 'row',
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 8,
  },
  optionChipSelected: {
    backgroundColor: '#007AFF',
  },
  phoneChipSelected: {
    backgroundColor: '#5856D6',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  optionChipTextSelected: {
    color: '#fff',
  },
  locationStepContent: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  locationCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  locationStatus: {
    alignItems: 'center',
  },
  locationWithMap: {
    alignItems: 'center',
  },
  miniMapContainer: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  locationBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  locationBadgeDevice: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  locationBadgeTextDevice: {
    color: '#007AFF',
  },
  locationBadgePhone: {
    backgroundColor: 'rgba(88, 86, 214, 0.1)',
  },
  locationBadgeTextPhone: {
    color: '#5856D6',
  },
  trackingInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  trackingInfoText: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },
  trackingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  trackingToggleActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#34C759',
  },
  trackingToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  trackingToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  trackingToggleTextActive: {
    color: '#34C759',
  },
  trackingToggleHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E5EA',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#34C759',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 18 }],
  },
  changeLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  changeLocationText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  locationStatusText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
  locationErrorText: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  manualLocationText: {
    fontSize: 15,
    color: '#007AFF',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryRow: {
    marginBottom: 8,
  },
  summaryTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  summaryTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  summaryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  summaryImageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryImageText: {
    fontSize: 13,
    color: '#34C759',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  urgentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  urgentToggleActive: {
    backgroundColor: '#FFEBEB',
    borderColor: '#FF3B30',
  },
  urgentToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  urgentToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  urgentToggleTextActive: {
    color: '#FF3B30',
  },
  urgentToggleHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  urgentToggleSwitchActive: {
    backgroundColor: '#FF3B30',
  },
  // Device Section Styles - Modern List Design
  deviceSection: {
    marginBottom: 24,
  },
  deviceList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  deviceRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceRowContent: {
    flex: 1,
  },
  deviceRowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  deviceRowSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  trackingInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#34C759',
    lineHeight: 18,
  },
});
