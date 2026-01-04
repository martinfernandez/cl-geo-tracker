import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { areaApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';

export default function CreateAreaScreen({ navigation }: any) {
  const { showSuccess, showError } = useToast();
  const { isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(-34.6037); // Buenos Aires default
  const [longitude, setLongitude] = useState(-58.3816);
  const [radius, setRadius] = useState(5000); // 5km default
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE_SHAREABLE' | 'PRIVATE'>('PUBLIC');
  const [loading, setLoading] = useState(false);

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showError('Por favor ingresa un nombre para el área');
      return;
    }

    try {
      setLoading(true);
      const newArea = await areaApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        latitude,
        longitude,
        radius,
        visibility,
      });

      // Show success toast
      showSuccess('Área creada correctamente');

      // Navigate to AreasListScreen and force refresh
      setTimeout(() => {
        navigation.navigate('AreasList', { refresh: true });
      }, 500);
    } catch (error) {
      console.error('Error creating area:', error);
      showError('No se pudo crear el área');
    } finally {
      setLoading(false);
    }
  };

  const visibilityOptions = [
    {
      value: 'PUBLIC' as const,
      label: 'Pública',
      description: 'Cualquiera puede buscar y unirse',
      color: '#34C759',
    },
    {
      value: 'PRIVATE_SHAREABLE' as const,
      label: 'Privada (Compartible)',
      description: 'Requiere aprobación para unirse',
      color: '#FF9500',
    },
    {
      value: 'PRIVATE' as const,
      label: 'Privada',
      description: 'Solo por invitación',
      color: '#8E8E93',
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={28} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Área</Text>
        <TouchableOpacity
          onPress={handleCreate}
          style={styles.headerButton}
          disabled={loading}
        >
          <Text style={[styles.createButtonText, loading && styles.createButtonTextDisabled]}>
            Crear
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Form */}
        <View style={styles.section}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Mi barrio, Trabajo, Casa"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={styles.label}>Descripción (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe el área de interés"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Map */}
        <View style={styles.section}>
          <Text style={styles.label}>Ubicación</Text>
          <Text style={styles.hint}>Toca el mapa para establecer el centro del área</Text>
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude,
                longitude,
                latitudeDelta: (radius / 111000) * 4,
                longitudeDelta: (radius / 111000) * 4,
              }}
              onPress={handleMapPress}
              userInterfaceStyle={isDark ? 'dark' : 'light'}
            >
              <Marker
                coordinate={{ latitude, longitude }}
                draggable
                onDragEnd={handleMapPress}
              >
                <View style={styles.centerMarker}>
                  <Ionicons name="location" size={32} color="#007AFF" />
                </View>
              </Marker>
              <Circle
                center={{ latitude, longitude }}
                radius={radius}
                strokeColor="rgba(0, 122, 255, 0.5)"
                fillColor="rgba(0, 122, 255, 0.1)"
                strokeWidth={2}
              />
            </MapView>
          </View>
          <View style={styles.coordinatesRow}>
            <Text style={styles.coordinatesText}>
              Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        {/* Radius */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Radio</Text>
            <Text style={styles.radiusValue}>{(radius / 1000).toFixed(1)} km</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={500}
            maximumValue={50000}
            step={500}
            value={radius}
            onValueChange={setRadius}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#ccc"
            thumbTintColor="#007AFF"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0.5 km</Text>
            <Text style={styles.sliderLabel}>50 km</Text>
          </View>
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={styles.label}>Visibilidad</Text>
          {visibilityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.visibilityOption,
                visibility === option.value && styles.visibilityOptionSelected,
              ]}
              onPress={() => setVisibility(option.value)}
            >
              <View style={styles.visibilityOptionLeft}>
                <View
                  style={[
                    styles.visibilityRadio,
                    visibility === option.value && styles.visibilityRadioSelected,
                  ]}
                >
                  {visibility === option.value && (
                    <View
                      style={[
                        styles.visibilityRadioInner,
                        { backgroundColor: option.color },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.visibilityOptionText}>
                  <Text style={styles.visibilityLabel}>{option.label}</Text>
                  <Text style={styles.visibilityDescription}>{option.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  createButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  createButtonTextDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#262626',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  centerMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinatesRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  radiusValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  visibilityOptionSelected: {
    backgroundColor: '#E8F1FF',
  },
  visibilityOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  visibilityRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityRadioSelected: {
    borderColor: '#007AFF',
  },
  visibilityRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  visibilityOptionText: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  visibilityDescription: {
    fontSize: 13,
    color: '#666',
  },
});
