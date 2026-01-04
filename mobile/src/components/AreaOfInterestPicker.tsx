import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (area: { latitude: number; longitude: number; radius: number }) => void;
  initialArea?: { latitude: number; longitude: number; radius: number };
}

const DEFAULT_CENTER = { latitude: -34.6037, longitude: -58.3816 };

export default function AreaOfInterestPicker({
  visible,
  onClose,
  onSave,
  initialArea,
}: Props) {
  const { isDark } = useTheme();
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>(DEFAULT_CENTER);
  const [radius, setRadius] = useState(5000);
  const [region, setRegion] = useState<Region | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      const targetCenter = initialArea
        ? { latitude: initialArea.latitude, longitude: initialArea.longitude }
        : DEFAULT_CENTER;
      const targetRadius = initialArea?.radius || 5000;
      const delta = Math.max((targetRadius / 111000) * 3, 0.01);

      setCenter(targetCenter);
      setRadius(targetRadius);
      setRegion({
        latitude: targetCenter.latitude,
        longitude: targetCenter.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      });
    } else {
      setRegion(null);
    }
  }, [visible, initialArea]);

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setCenter({ latitude, longitude });
  };

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
  }, []);

  const handleSave = () => {
    onSave({
      latitude: center.latitude,
      longitude: center.longitude,
      radius,
    });
    onClose();
  };

  if (!visible || !region) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Área de Interés</Text>
          <Text style={styles.subtitle}>
            Toca en el mapa para seleccionar el centro
          </Text>
        </View>

        <MapView
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={handleMapPress}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
        >
          <Marker coordinate={center} title="Centro del área" />
          <Circle
            center={center}
            radius={radius}
            fillColor="rgba(0, 122, 255, 0.2)"
            strokeColor="rgba(0, 122, 255, 0.5)"
            strokeWidth={2}
          />
        </MapView>

        <View style={styles.controls}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Centro:</Text>
            <Text style={styles.infoText}>
              {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
            </Text>
          </View>

          <View style={styles.radiusControl}>
            <Text style={styles.radiusLabel}>
              Radio: {(radius / 1000).toFixed(1)} km
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={10000}
              step={100}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#ddd"
            />
            <View style={styles.radiusLimits}>
              <Text style={styles.limitText}>0.1 km</Text>
              <Text style={styles.limitText}>10 km</Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  controls: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  infoBox: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  radiusControl: {
    marginBottom: 20,
  },
  radiusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusLimits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  limitText: {
    fontSize: 12,
    color: '#666',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
