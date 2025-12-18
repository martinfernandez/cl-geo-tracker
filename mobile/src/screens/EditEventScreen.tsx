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
import { eventApi } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MapLocationPicker from '../components/MapLocationPicker';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params: { eventId: string } }, 'params'>;
};

const EVENT_TYPES = [
  { label: 'Robo', value: 'THEFT', icon: 'warning', color: '#FF3B30' },
  { label: 'Extravío', value: 'LOST', icon: 'help-circle', color: '#FF9500' },
  { label: 'Accidente', value: 'ACCIDENT', icon: 'car', color: '#FFCC00' },
  { label: 'Incendio', value: 'FIRE', icon: 'flame', color: '#FF2D55' },
];

const EVENT_STATUS = [
  { label: 'En Progreso', value: 'IN_PROGRESS', icon: 'time', color: '#FF9500' },
  { label: 'Cerrado', value: 'CLOSED', icon: 'checkmark-circle', color: '#34C759' },
];

export default function EditEventScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const [eventType, setEventType] = useState('THEFT');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);

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
      setLocation({
        latitude: event.latitude,
        longitude: event.longitude,
      });
      if (event.imageUrl) {
        setImageUri(event.imageUrl);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'No se pudo cargar el evento');
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
  };

  const handleSubmit = async () => {
    if (!description || !location) {
      Alert.alert('Error', 'Por favor completa la descripción y selecciona una ubicación');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = imageUri;

      if (imageUri && imageUri.startsWith('file://')) {
        imageUrl = await eventApi.uploadImage(imageUri);
      }

      await eventApi.update(eventId, {
        type: eventType,
        status,
        description,
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl: imageUrl || undefined,
      });

      Alert.alert('Éxito', 'Evento actualizado exitosamente', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error updating event:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el evento');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedEventType = () => {
    return EVENT_TYPES.find(t => t.value === eventType);
  };

  const getSelectedStatus = () => {
    return EVENT_STATUS.find(s => s.value === status);
  };

  if (loadingEvent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando evento...</Text>
      </View>
    );
  }

  const selectedType = getSelectedEventType();
  const selectedStatusObj = getSelectedStatus();

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
        <Text style={styles.headerTitle}>Editar Evento</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Evento</Text>
          <View style={styles.typesGrid}>
            {EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  eventType === type.value && styles.typeCardSelected,
                  { borderColor: eventType === type.value ? type.color : '#e0e0e0' },
                ]}
                onPress={() => setEventType(type.value)}
              >
                <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                  <Ionicons name={type.icon as any} size={24} color={type.color} />
                </View>
                <Text
                  style={[
                    styles.typeLabel,
                    eventType === type.value && { color: type.color },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado del Evento</Text>
          <View style={styles.statusGrid}>
            {EVENT_STATUS.map((statusOption) => (
              <TouchableOpacity
                key={statusOption.value}
                style={[
                  styles.statusCard,
                  status === statusOption.value && styles.statusCardSelected,
                  { borderColor: status === statusOption.value ? statusOption.color : '#e0e0e0' },
                ]}
                onPress={() => setStatus(statusOption.value)}
              >
                <Ionicons
                  name={statusOption.icon as any}
                  size={32}
                  color={status === statusOption.value ? statusOption.color : '#999'}
                />
                <Text
                  style={[
                    styles.statusLabel,
                    status === statusOption.value && { color: statusOption.color },
                  ]}
                >
                  {statusOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe el evento..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCounter}>{description.length}/500</Text>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          {location && (
            <View style={styles.locationCard}>
              <Ionicons name="location" size={24} color="#007AFF" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationCoords}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={styles.changeLocationButton}
            onPress={() => setShowMapPicker(true)}
          >
            <Ionicons name="map-outline" size={20} color="#007AFF" />
            <Text style={styles.changeLocationText}>Cambiar Ubicación</Text>
          </TouchableOpacity>
        </View>

        {/* Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imagen</Text>

          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri.startsWith('file://') ? imageUri : `http://192.168.0.69:3000${imageUri}` }} style={styles.imagePreview} />
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={() => {
                    Alert.alert(
                      'Cambiar Imagen',
                      'Selecciona una opción',
                      [
                        { text: 'Tomar Foto', onPress: takePhoto },
                        { text: 'Galería', onPress: pickImage },
                        { text: 'Cancelar', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Ionicons name="images-outline" size={20} color="#007AFF" />
                  <Text style={styles.changeImageText}>Cambiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  <Text style={styles.removeImageText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageOptionsGrid}>
              <TouchableOpacity style={styles.imageOption} onPress={takePhoto}>
                <View style={styles.imageOptionIcon}>
                  <Ionicons name="camera" size={28} color="#007AFF" />
                </View>
                <Text style={styles.imageOptionTitle}>Tomar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.imageOption} onPress={pickImage}>
                <View style={styles.imageOptionIcon}>
                  <Ionicons name="images" size={28} color="#007AFF" />
                </View>
                <Text style={styles.imageOptionTitle}>Galería</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Guardar Cambios</Text>
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  section: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  typeCardSelected: {
    backgroundColor: '#f0f9ff',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    flex: 1,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  statusCardSelected: {
    backgroundColor: '#f0f9ff',
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginTop: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#262626',
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  charCounter: {
    fontSize: 13,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationCoords: {
    fontSize: 15,
    color: '#262626',
    fontWeight: '500',
  },
  changeLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  changeLocationText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 12,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  changeImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  changeImageText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  removeImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  removeImageText: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
  },
  imageOptionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  imageOption: {
    flex: 1,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
  },
  imageOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imageOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
