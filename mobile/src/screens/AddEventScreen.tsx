import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { eventApi, deviceApi, groupApi, phoneLocationApi } from '../services/api';
import { startForegroundTracking } from '../services/backgroundLocation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import MapLocationPicker from '../components/MapLocationPicker';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { processImageForUpload } from '../utils/imageUtils';
import { UrgentPulsingDot } from '../components/UrgentPulsingDot';
import { MediaPicker, LocalMediaItem } from '../components/MediaPicker';
import { MediaCarousel, MediaItem } from '../components/MediaCarousel';

type RouteParams = {
  AddEvent: {
    deviceId?: string;
  };
};

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
  const { theme, isDark } = useTheme();
  const route = useRoute<RouteProp<RouteParams, 'AddEvent'>>();
  const preselectedDeviceId = route.params?.deviceId;
  const parentNavigation = useNavigation();

  // Hide tab bar when this screen is focused
  useLayoutEffect(() => {
    const parent = parentNavigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    }
    return () => {
      if (parent) {
        // Restore tab bar with theme colors
        parent.setOptions({
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            height: 85,
            paddingBottom: 20,
            paddingTop: 12,
          },
        });
      }
    };
  }, [parentNavigation, theme]);

  // Step state: 0 = details, 1 = location (type selection is inline now)
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Form state - GENERAL preselected
  const [eventType, setEventType] = useState('GENERAL');
  const [description, setDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<LocalMediaItem[]>([]);
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
  const [loadingDeviceLocation, setLoadingDeviceLocation] = useState(false);
  const [deviceLocationError, setDeviceLocationError] = useState<string | null>(null);
  const [lastPositionTime, setLastPositionTime] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Reset form - but don't reset device selection if preselected via params
      setCurrentStep(0);
      setEventType('GENERAL');
      setDescription('');
      setSelectedMedia([]);
      setLocation(null);
      // Only reset device selection if not preselected
      if (!preselectedDeviceId) {
        setSelectedDevice('');
        setUsePhoneDevice(false);
        setRealTimeTracking(false);
      }
      setSelectedGroup(null);
      setIsPublic(true);
      setDeviceLocation(null);
      setIsUrgent(false);
      setLoadingDeviceLocation(false);
      setDeviceLocationError(null);
      setLastPositionTime(null);
      slideAnim.setValue(0);

      // Load data
      loadDevices();
      loadAdminGroups();
      loadPhoneDevice();
    }, [preselectedDeviceId])
  );

  useEffect(() => {
    requestPermissions();
  }, []);

  // Get location when entering step 1
  // Only get phone's current location if NOT using a GPS device with real-time tracking
  useEffect(() => {
    if (currentStep === 1 && !location) {
      // If using GPS device with real-time tracking, load device location instead
      if (selectedDevice && realTimeTracking) {
        console.log('[AddEvent] Step 1: Loading device location for selectedDevice:', selectedDevice);
        loadDeviceLocation(selectedDevice);
      } else if (!usePhoneDevice || !realTimeTracking) {
        // Only get phone's location if not using real-time tracking at all
        console.log('[AddEvent] Step 1: Getting phone location (no device tracking)');
        getCurrentLocation();
      }
    }
  }, [currentStep, selectedDevice, realTimeTracking, usePhoneDevice]);

  const requestPermissions = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await Location.requestForegroundPermissionsAsync();
  };

  const loadDevices = async () => {
    try {
      const data = await deviceApi.getAll();
      setDevices(data);

      // If a device was preselected via route params, select it
      if (preselectedDeviceId) {
        const preselectedDevice = data.find((d: any) => d.id === preselectedDeviceId);
        if (preselectedDevice) {
          setSelectedDevice(preselectedDeviceId);
          setUsePhoneDevice(false);
          setRealTimeTracking(true);
          return; // Skip default selection logic
        }
      }

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
    console.log('[AddEvent] Loading device location for:', deviceId);
    setLoadingDeviceLocation(true);
    setDeviceLocationError(null);
    setLastPositionTime(null);

    try {
      // Always fetch fresh data from API to get the most recent position
      console.log('[AddEvent] Fetching device from API...');
      const device = await deviceApi.getById(deviceId);
      console.log('[AddEvent] Device response:', {
        id: device?.id,
        name: device?.name,
        positionsCount: device?.positions?.length || 0,
      });

      // The backend returns device.positions as an array (sorted by timestamp desc, take 10)
      // We use positions[0] which is the most recent position
      if (device?.positions && device.positions.length > 0) {
        const lastPosition = device.positions[0];
        console.log('[AddEvent] Device has position:', {
          latitude: lastPosition.latitude,
          longitude: lastPosition.longitude,
          timestamp: lastPosition.timestamp,
        });

        setDeviceLocation({
          latitude: lastPosition.latitude,
          longitude: lastPosition.longitude,
        });
        setLocation({
          latitude: lastPosition.latitude,
          longitude: lastPosition.longitude,
        });

        // Store timestamp to show how recent the position is
        if (lastPosition.timestamp) {
          setLastPositionTime(lastPosition.timestamp);
        }

        setDeviceLocationError(null);
      } else {
        // No positions at all - device has never reported
        console.warn('[AddEvent] Device has no positions:', deviceId);
        setDeviceLocationError('El dispositivo no tiene ubicacion registrada. Puede estar apagado o sin bateria.');
        setDeviceLocation(null);
        setLocation(null);
      }
    } catch (error) {
      console.error('[AddEvent] Error loading device location:', error);
      setDeviceLocationError('Error al obtener la ubicacion del dispositivo. Intenta de nuevo.');
      setDeviceLocation(null);
      setLocation(null);
    } finally {
      setLoadingDeviceLocation(false);
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

  const handleSubmit = async () => {
    if (!location) {
      showError('Esperando ubicacion...');
      return;
    }

    setLoading(true);
    try {
      // Upload media files
      let mediaData: Array<{ type: 'IMAGE' | 'VIDEO'; url: string; thumbnailUrl?: string; duration?: number }> = [];
      let imageUrl: string | undefined;

      if (selectedMedia.length > 0) {
        console.log('[AddEvent] Uploading media files:', selectedMedia.length);
        try {
          // Process and upload each media item
          for (const item of selectedMedia) {
            if (item.type === 'IMAGE') {
              // Resize image before upload
              const processed = await processImageForUpload(item.uri, 'EVENT');
              console.log('[AddEvent] Image resized:', processed.width, 'x', processed.height);
              const uploaded = await eventApi.uploadMedia(processed.uri, 'IMAGE');
              mediaData.push({
                type: 'IMAGE',
                url: uploaded.url,
              });
              // Use first image as imageUrl for backward compatibility
              if (!imageUrl) {
                imageUrl = uploaded.url;
              }
            } else {
              // Upload video directly
              const uploaded = await eventApi.uploadMedia(item.uri, 'VIDEO');
              mediaData.push({
                type: 'VIDEO',
                url: uploaded.url,
                thumbnailUrl: uploaded.thumbnailUrl,
                duration: uploaded.duration || item.duration,
              });
            }
          }
          console.log('[AddEvent] Media uploaded:', mediaData.length, 'files');
        } catch (uploadError: any) {
          console.error('[AddEvent] Media upload failed:', uploadError);
          console.error('[AddEvent] Upload error response:', uploadError.response?.data);
          // Continue without media if upload fails
          mediaData = [];
        }
      }

      const eventData: any = {
        type: eventType,
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl,
        media: mediaData.length > 0 ? mediaData : undefined,
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

      // Start foreground-only tracking if using phone device with real-time tracking
      // This only requests "while using the app" permission, not background permission
      if (usePhoneDevice && realTimeTracking) {
        console.log('[AddEvent] Starting foreground location tracking for phone event...');
        const trackingStarted = await startForegroundTracking();
        if (trackingStarted) {
          console.log('[AddEvent] Foreground tracking started successfully');
          showSuccess('Evento publicado - ubicacion compartida');
        } else {
          console.warn('[AddEvent] Foreground tracking could not start');
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

  // Helper to format last position time
  const formatLastPositionTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  const renderDetailsStep = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.stepContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Event Type Selector */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Tipo de evento</Text>
        <View style={styles.typeSelector}>
          {EVENT_TYPES.map(type => {
            const isSelected = eventType === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' },
                  isSelected && { backgroundColor: type.color, borderColor: type.color },
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
          style={[
            styles.urgentToggle,
            { backgroundColor: isDark ? '#2C2C2E' : '#F8F8F8', borderColor: isDark ? '#3A3A3C' : '#E5E5EA' },
            isUrgent && { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : '#FFEBEB', borderColor: '#FF3B30' }
          ]}
          onPress={() => setIsUrgent(!isUrgent)}
        >
          <View style={styles.urgentToggleLeft}>
            <Ionicons
              name={isUrgent ? "alert-circle" : "alert-circle-outline"}
              size={20}
              color={isUrgent ? '#FF3B30' : theme.textSecondary}
            />
            <View>
              <Text style={[styles.urgentToggleText, { color: theme.text }, isUrgent && styles.urgentToggleTextActive]}>
                Marcar como urgente
              </Text>
              <Text style={[styles.urgentToggleHint, { color: (isUrgent && isDark) ? 'rgba(255, 59, 48, 0.8)' : theme.textSecondary }]}>
                {isUrgent ? 'Se mostrara con indicador pulsante' : 'Mayor visibilidad en el feed'}
              </Text>
            </View>
          </View>
          <View style={[styles.toggleSwitch, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }, isUrgent && styles.urgentToggleSwitchActive]}>
            <View style={[styles.toggleKnob, isUrgent && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Device Selection - Modern Card Design */}
      <View style={styles.deviceSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Seguimiento en vivo</Text>

        {/* Device List */}
        <View style={[styles.deviceList, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
          {/* No tracking option */}
          <TouchableOpacity
            style={[styles.deviceRow, { borderBottomColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}
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
            <View style={[styles.deviceRowIcon, { backgroundColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}>
              <Ionicons name="location-outline" size={22} color={theme.textSecondary} />
            </View>
            <View style={styles.deviceRowContent}>
              <Text style={[styles.deviceRowTitle, { color: theme.text }]}>Solo ubicacion inicial</Text>
              <Text style={[styles.deviceRowSubtitle, { color: theme.textSecondary }]}>Elegir ubicacion en el mapa</Text>
            </View>
            <View style={[styles.radioOuter, !selectedDevice && !usePhoneDevice && styles.radioOuterSelected]}>
              {!selectedDevice && !usePhoneDevice && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Phone Device */}
          {phoneDevice && (
            <TouchableOpacity
              style={[styles.deviceRow, { borderBottomColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}
              onPress={() => {
                handleDeviceSelect('');
                setUsePhoneDevice(true);
                setRealTimeTracking(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.deviceRowIcon, { backgroundColor: isDark ? 'rgba(88, 86, 214, 0.2)' : '#EDE7F6' }]}>
                <Ionicons name="phone-portrait" size={22} color="#5856D6" />
              </View>
              <View style={styles.deviceRowContent}>
                <Text style={[styles.deviceRowTitle, { color: theme.text }]}>Este iPhone</Text>
                <Text style={[styles.deviceRowSubtitle, { color: theme.textSecondary }]}>Compartir ubicacion en tiempo real</Text>
              </View>
              <View style={[styles.radioOuter, usePhoneDevice && styles.radioOuterSelected]}>
                {usePhoneDevice && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          )}

          {/* GPS Tracker Devices */}
          {devices.filter(d => d.type === 'GPS_TRACKER').map(device => (
            <React.Fragment key={device.id}>
              <TouchableOpacity
                style={[styles.deviceRow, { borderBottomColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}
                onPress={() => {
                  handleDeviceSelect(device.id);
                  setUsePhoneDevice(false);
                  setRealTimeTracking(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.deviceRowIcon, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : '#E3F2FD' }]}>
                  <Ionicons name="navigate" size={22} color="#007AFF" />
                </View>
                <View style={styles.deviceRowContent}>
                  <Text style={[styles.deviceRowTitle, { color: theme.text }]}>{device.name || `JX10-${device.imei?.slice(-4)}`}</Text>
                  <Text style={[styles.deviceRowSubtitle, { color: theme.textSecondary }]}>Rastreador GPS</Text>
                </View>
                <View style={[styles.radioOuter, selectedDevice === device.id && styles.radioOuterSelected]}>
                  {selectedDevice === device.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              {/* Device Location Status - only show when this device is selected */}
              {selectedDevice === device.id && (
                <View style={[styles.deviceLocationStatus, { backgroundColor: isDark ? '#2C2C2E' : '#FAFAFA', borderBottomColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}>
                  {loadingDeviceLocation ? (
                    <View style={styles.deviceLocationLoading}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={[styles.deviceLocationLoadingText, { color: theme.textSecondary }]}>Obteniendo ubicacion del dispositivo...</Text>
                    </View>
                  ) : deviceLocationError ? (
                    <View style={styles.deviceLocationError}>
                      <Ionicons name="warning" size={16} color="#FF3B30" />
                      <Text style={styles.deviceLocationErrorText}>{deviceLocationError}</Text>
                      <TouchableOpacity
                        style={styles.retryLocationBtn}
                        onPress={() => loadDeviceLocation(device.id)}
                      >
                        <Text style={styles.retryLocationBtnText}>Reintentar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : deviceLocation ? (
                    <View style={styles.deviceLocationSuccess}>
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                      <Text style={styles.deviceLocationSuccessText}>
                        Ubicacion obtenida {lastPositionTime ? formatLastPositionTime(lastPositionTime) : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </React.Fragment>
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
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Descripcion</Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
          <TextInput
            style={[styles.descriptionInput, { color: theme.text }]}
            placeholder="Que esta pasando? Describe la situacion..."
            placeholderTextColor={isDark ? '#8E8E93' : '#999'}
            value={description}
            onChangeText={setDescription}
            multiline={true}
            maxLength={500}
          />
          <Text style={[styles.charCounter, { color: theme.textSecondary }]}>{`${description.length}/500`}</Text>
        </View>
      </View>

      {/* Media (Photos & Videos) */}
      <View style={styles.section}>
        <MediaPicker
          selectedMedia={selectedMedia}
          onMediaChange={setSelectedMedia}
          maxItems={5}
          maxVideoDuration={15}
        />
      </View>

      {/* Group (if available) */}
      {adminGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Publicar en</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.optionChip, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }, !selectedGroup && styles.optionChipSelected]}
              onPress={() => { setSelectedGroup(null); setIsPublic(true); }}
            >
              <Ionicons name="globe-outline" size={16} color={!selectedGroup ? '#fff' : theme.textSecondary} />
              <Text style={[styles.optionChipText, { color: theme.textSecondary }, !selectedGroup && styles.optionChipTextSelected]}>
                Publico
              </Text>
            </TouchableOpacity>
            {adminGroups.map(group => (
              <TouchableOpacity
                key={group.id}
                style={[styles.optionChip, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }, selectedGroup === group.id && styles.optionChipSelected]}
                onPress={() => { setSelectedGroup(group.id); setIsPublic(false); }}
              >
                <Ionicons name="people-outline" size={16} color={selectedGroup === group.id ? '#fff' : theme.textSecondary} />
                <Text style={[styles.optionChipText, { color: theme.textSecondary }, selectedGroup === group.id && styles.optionChipTextSelected]}>
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
      <ScrollView
        style={styles.locationStepScrollView}
        contentContainerStyle={styles.locationStepScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location Card - Full Width */}
        <View style={[styles.locationCardFullWidth, { backgroundColor: theme.surface, borderBottomColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
          <Text style={[styles.locationCardTitleFullWidth, { color: theme.text }]}>Ubicacion del evento</Text>

          {loadingLocation ? (
            <View style={styles.locationStatus}>
              <ActivityIndicator size="large" color={theme.primary.main} />
              <Text style={[styles.locationStatusText, { color: theme.textSecondary }]}>Obteniendo ubicacion...</Text>
            </View>
          ) : location ? (
            <View style={styles.locationWithMapFullWidth}>
              {/* Mini Map Preview - Full Width */}
              <View style={styles.miniMapContainerFullWidth}>
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
                  style={styles.changeLocationBtnFullWidth}
                  onPress={() => setShowMapPicker(true)}
                >
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                  <Text style={styles.changeLocationText}>Cambiar ubicacion</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.trackingInfoBoxFullWidth}>
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
              <Text style={[styles.locationErrorText, { color: theme.textSecondary }]}>No se pudo obtener</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={getCurrentLocation}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMapPicker(true)}>
                <Text style={[styles.manualLocationText, { color: theme.primary.main }]}>Seleccionar en mapa</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Event Preview - Instagram/Feed Style (matches EventDetailScreen) - Full Width */}
        <View style={[styles.previewCardFullWidth, { backgroundColor: theme.surface, borderBottomColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
          <Text style={[styles.previewTitleFullWidth, { color: theme.textSecondary }]}>Vista previa</Text>

          {/* User Header - Like EventDetailScreen */}
          <View style={styles.previewUserHeaderFullWidth}>
            <View style={[styles.previewAvatar, { backgroundColor: selectedTypeConfig?.color || '#007AFF' }]}>
              <Text style={styles.previewAvatarText}>T</Text>
            </View>
            <View style={styles.previewUserTextContainer}>
              <Text style={[styles.previewUserName, { color: theme.text }]}>Tu</Text>
              <View style={styles.previewUserSubtitle}>
                {isUrgent && <UrgentPulsingDot size="small" />}
                <View style={[styles.previewTypeBadge, { backgroundColor: selectedTypeConfig?.color || '#007AFF' }]}>
                  <Ionicons name={selectedTypeConfig?.icon as any || 'megaphone-outline'} size={10} color="#fff" />
                  <Text style={styles.previewTypeBadgeText}>{selectedTypeConfig?.label || 'General'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Media Preview - Carousel */}
          {selectedMedia.length > 0 && (
            <MediaCarousel
              media={selectedMedia.map((item, index) => ({
                id: `preview-${index}`,
                type: item.type,
                url: item.uri,
                order: index,
                duration: item.duration,
              }))}
              height={250}
              showIndicators={selectedMedia.length > 1}
              compact={false}
            />
          )}


          {/* Description - Instagram style */}
          <View style={styles.previewDescriptionContainerFullWidth}>
            <Text style={[styles.previewDescription, { color: theme.text }]}>
              <Text style={styles.previewDescriptionUserName}>Tu </Text>
              {description}
            </Text>
          </View>

          {/* Device info if using tracking */}
          {(selectedDevice || usePhoneDevice) && realTimeTracking && (
            <View style={styles.previewDeviceInfoFullWidth}>
              <Ionicons name={usePhoneDevice ? "phone-portrait" : "navigate"} size={14} color={theme.textSecondary} />
              <Text style={[styles.previewDeviceText, { color: theme.textSecondary }]}>
                {usePhoneDevice ? 'Compartiendo desde este telefono' : 'Rastreando dispositivo GPS'}
              </Text>
            </View>
          )}
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Publish Button */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12, backgroundColor: theme.surface, borderTopColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}>
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
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerSide}>
          <TouchableOpacity
            onPress={() => currentStep === 1 ? animateToStep(0) : navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name={currentStep === 1 ? "arrow-back" : "close"} size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Nuevo Evento</Text>
        <View style={styles.headerSide}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }, currentStep >= 0 && styles.stepDotActive]} />
            <View style={[styles.stepDot, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }, currentStep >= 1 && styles.stepDotActive]} />
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
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12, backgroundColor: theme.surface, borderTopColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!description.trim() || (!!selectedDevice && (!!deviceLocationError || loadingDeviceLocation))) && styles.continueBtnDisabled,
            ]}
            onPress={handleNextFromDetails}
            disabled={!description.trim() || (!!selectedDevice && (!!deviceLocationError || loadingDeviceLocation))}
          >
            {!!selectedDevice && loadingDeviceLocation ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.continueBtnText}>Obteniendo ubicacion...</Text>
              </>
            ) : !!selectedDevice && !!deviceLocationError ? (
              <>
                <Ionicons name="warning" size={20} color="#fff" />
                <Text style={styles.continueBtnText}>Sin ubicacion del dispositivo</Text>
              </>
            ) : (
              <>
                <Text style={styles.continueBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
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
  // Preview Card - matches EventDetailScreen style
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  previewUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  previewUserTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  previewUserName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewUserSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  previewTypeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  previewEventImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  previewInteractionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  previewInteractionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewInteractionButton: {
    padding: 4,
  },
  previewTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  previewTimeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewDescriptionContainer: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  previewDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewDescriptionUserName: {
    fontWeight: '600',
  },
  previewDeviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  previewDeviceText: {
    fontSize: 13,
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
  // Device Location Status Styles
  deviceLocationStatus: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  deviceLocationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deviceLocationLoadingText: {
    fontSize: 13,
    color: '#666',
  },
  deviceLocationError: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deviceLocationErrorText: {
    fontSize: 13,
    color: '#FF3B30',
    lineHeight: 18,
    marginLeft: 24,
    marginTop: -20,
  },
  retryLocationBtn: {
    alignSelf: 'flex-start',
    marginLeft: 24,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 14,
  },
  retryLocationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  deviceLocationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceLocationSuccessText: {
    fontSize: 13,
    color: '#34C759',
  },
  // Full Width Styles for Step 2 (Location/Preview)
  locationStepScrollView: {
    flex: 1,
  },
  locationStepScrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  locationCardFullWidth: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  locationCardTitleFullWidth: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  locationWithMapFullWidth: {
    alignItems: 'center',
  },
  miniMapContainerFullWidth: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  changeLocationBtnFullWidth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  trackingInfoBoxFullWidth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  previewCardFullWidth: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  previewTitleFullWidth: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  previewUserHeaderFullWidth: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewEventImageFullWidth: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  previewInteractionBarFullWidth: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  previewDescriptionContainerFullWidth: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  previewDeviceInfoFullWidth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
