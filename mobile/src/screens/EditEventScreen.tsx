import React, { useState, useEffect, useLayoutEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { eventApi } from '../services/api';
import { BASE_URL } from '../config/environment';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation } from '@react-navigation/native';
import MapLocationPicker from '../components/MapLocationPicker';
import { Ionicons } from '@expo/vector-icons';
import { processImageForUpload } from '../utils/imageUtils';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { UrgentPulsingDot } from '../components/UrgentPulsingDot';
import MapView, { Marker } from 'react-native-maps';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params: { eventId: string } }, 'params'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EVENT_TYPES = [
  { value: 'GENERAL', icon: 'megaphone-outline', label: 'General', color: '#007AFF' },
  { value: 'THEFT', icon: 'warning-outline', label: 'Robo', color: '#FF3B30' },
  { value: 'LOST', icon: 'search-outline', label: 'Extravio', color: '#FF9500' },
  { value: 'ACCIDENT', icon: 'car-outline', label: 'Accidente', color: '#FF6B00' },
  { value: 'FIRE', icon: 'flame-outline', label: 'Incendio', color: '#FF2D55' },
];

export default function EditEventScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const { theme, isDark } = useTheme();
  const parentNavigation = useNavigation();
  const { eventId } = route.params;

  // Hide tab bar when this screen is focused
  useLayoutEffect(() => {
    const parent = parentNavigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    }
    return () => {
      if (parent) {
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

  const [eventType, setEventType] = useState('GENERAL');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [hasRealTimeTracking, setHasRealTimeTracking] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    setLoadingEvent(true);
    try {
      let event;
      try {
        event = await eventApi.getPublicById(eventId);
      } catch (publicError) {
        event = await eventApi.getById(eventId);
      }
      setEventType(event.type);
      setStatus(event.status);
      setDescription(event.description);
      setIsUrgent(event.isUrgent || false);
      setHasRealTimeTracking(event.realTimeTracking || false);
      setLocation({
        latitude: event.latitude,
        longitude: event.longitude,
      });
      if (event.imageUrl) {
        setImageUri(event.imageUrl);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      showError('No se pudo cargar el evento');
      navigation.goBack();
    } finally {
      setLoadingEvent(false);
    }
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

  const handleManualLocation = (loc: { latitude: number; longitude: number }) => {
    setLocation(loc);
    setShowMapPicker(false);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showError('Por favor completa la descripcion');
      return;
    }

    if (!location) {
      showError('Selecciona una ubicacion');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = imageUri;

      if (imageUri && imageUri.startsWith('file://')) {
        const processed = await processImageForUpload(imageUri, 'EVENT');
        console.log('[EditEvent] Image resized:', processed.width, 'x', processed.height);
        imageUrl = await eventApi.uploadImage(processed.uri);
      }

      await eventApi.update(eventId, {
        type: eventType,
        status,
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl: imageUrl || undefined,
        isUrgent,
      });

      showSuccess('Evento actualizado');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error updating event:', error);
      showError(error.response?.data?.error || 'No se pudo actualizar el evento');
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeConfig = EVENT_TYPES.find(t => t.value === eventType);

  if (loadingEvent) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary.main} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando evento...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Editar Evento</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

        {/* Status Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Estado del evento</Text>
          <View style={styles.statusToggle}>
            <TouchableOpacity
              style={[
                styles.statusOption,
                { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' },
                status === 'IN_PROGRESS' && { backgroundColor: '#FF9500', borderColor: '#FF9500' },
              ]}
              onPress={() => setStatus('IN_PROGRESS')}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={status === 'IN_PROGRESS' ? '#fff' : theme.textSecondary}
              />
              <Text style={[
                styles.statusOptionText,
                { color: theme.textSecondary },
                status === 'IN_PROGRESS' && { color: '#fff' },
              ]}>
                En progreso
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusOption,
                { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' },
                status === 'CLOSED' && { backgroundColor: '#34C759', borderColor: '#34C759' },
              ]}
              onPress={() => setStatus('CLOSED')}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={status === 'CLOSED' ? '#fff' : theme.textSecondary}
              />
              <Text style={[
                styles.statusOptionText,
                { color: theme.textSecondary },
                status === 'CLOSED' && { color: '#fff' },
              ]}>
                Cerrado
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Descripcion</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
            <TextInput
              style={[styles.descriptionInput, { color: theme.text }]}
              placeholder="Describe que esta pasando..."
              placeholderTextColor={isDark ? '#8E8E93' : '#999'}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              maxLength={500}
            />
            <Text style={[styles.charCounter, { color: theme.textSecondary }]}>{`${description.length}/500`}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Ubicacion</Text>
          {location && (
            <View style={styles.locationPreview}>
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
                  <Marker coordinate={location}>
                    <View style={[styles.markerContainer, { backgroundColor: selectedTypeConfig?.color || '#007AFF' }]}>
                      <Ionicons name={selectedTypeConfig?.icon as any || 'megaphone-outline'} size={16} color="#fff" />
                    </View>
                  </Marker>
                </MapView>
                {hasRealTimeTracking && (
                  <View style={styles.trackingBadge}>
                    <Ionicons name="radio" size={14} color="#34C759" />
                    <Text style={styles.trackingBadgeText}>Rastreo activo</Text>
                  </View>
                )}
              </View>
              {!hasRealTimeTracking && (
                <TouchableOpacity
                  style={styles.changeLocationBtn}
                  onPress={() => setShowMapPicker(true)}
                >
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                  <Text style={styles.changeLocationText}>Cambiar ubicacion</Text>
                </TouchableOpacity>
              )}
              {hasRealTimeTracking && (
                <View style={styles.trackingInfo}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.trackingInfoText, { color: theme.textSecondary }]}>
                    La ubicacion se actualiza automaticamente desde el dispositivo
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Photo */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Foto</Text>
          {imageUri ? (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: imageUri.startsWith('file://') ? imageUri : `${BASE_URL}${imageUri}` }}
                style={styles.previewImage}
              />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={pickImage}
              >
                <Ionicons name="images-outline" size={18} color="#fff" />
                <Text style={styles.changeImageText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={24} color={theme.text} />
                <Text style={[styles.photoBtnText, { color: theme.text }]}>Camara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} onPress={pickImage}>
                <Ionicons name="images-outline" size={24} color={theme.text} />
                <Text style={[styles.photoBtnText, { color: theme.text }]}>Galeria</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12, backgroundColor: theme.surface, borderTopColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </>
          )}
        </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
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
    borderWidth: 1,
    gap: 6,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: '#fff',
  },
  urgentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
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
  },
  urgentToggleTextActive: {
    color: '#FF3B30',
  },
  urgentToggleHint: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  urgentToggleSwitchActive: {
    backgroundColor: '#FF3B30',
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
  statusToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputContainer: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  descriptionInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  locationPreview: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  miniMapContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
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
  trackingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trackingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  changeLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  changeLocationText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  trackingInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
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
  changeImageBtn: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  photoBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
