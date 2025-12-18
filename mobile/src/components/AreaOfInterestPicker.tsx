import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import Slider from '@react-native-community/slider';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (area: { latitude: number; longitude: number; radius: number }) => void;
  initialArea?: { latitude: number; longitude: number; radius: number };
}

export default function AreaOfInterestPicker({
  visible,
  onClose,
  onSave,
  initialArea,
}: Props) {
  const [center, setCenter] = useState<{
    latitude: number;
    longitude: number;
  }>(
    initialArea
      ? { latitude: initialArea.latitude, longitude: initialArea.longitude }
      : { latitude: -34.6037, longitude: -58.3816 } // Buenos Aires default
  );
  const [radius, setRadius] = useState(initialArea?.radius || 5000); // 5km default

  const defaultRegion: Region = {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setCenter({ latitude, longitude });
  };

  const handleSave = () => {
    onSave({
      latitude: center.latitude,
      longitude: center.longitude,
      radius,
    });
    onClose();
  };

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
          initialRegion={defaultRegion}
          onPress={handleMapPress}
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
