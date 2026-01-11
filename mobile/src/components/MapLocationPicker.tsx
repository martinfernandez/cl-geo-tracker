import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: { latitude: number; longitude: number }) => void;
  initialLocation?: { latitude: number; longitude: number };
}

const DEFAULT_LOCATION = { latitude: -34.6037, longitude: -58.3816 };

export default function MapLocationPicker({
  visible,
  onClose,
  onSelectLocation,
  initialLocation,
}: Props) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Get user location on mount
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error getting user location:', error);
      }
    };
    getUserLocation();
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      const loc = initialLocation || userLocation || DEFAULT_LOCATION;
      setSelectedLocation(initialLocation || null);
      setRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      setRegion(null);
    }
  }, [visible, initialLocation, userLocation]);

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
  }, []);

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelectLocation(selectedLocation);
      onClose();
    }
  };

  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleUseMyLocation = () => {
    if (userLocation) {
      setSelectedLocation(userLocation);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }
    }
  };

  if (!visible || !region) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[
          styles.header,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            paddingTop: insets.top + 8,
          }
        ]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Seleccionar Ubicación
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Toca en el mapa para marcar
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.headerButton,
              styles.confirmHeaderButton,
              !selectedLocation && styles.confirmHeaderButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedLocation}
          >
            <Ionicons
              name="checkmark"
              size={24}
              color={selectedLocation ? theme.primary.main : theme.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={handleRegionChangeComplete}
            onPress={handleMapPress}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.marker, { backgroundColor: theme.primary.main }]}>
                    <Ionicons name="location" size={24} color="#fff" />
                  </View>
                  <View style={[styles.markerShadow, { backgroundColor: theme.primary.main }]} />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Center on user button */}
          {userLocation && (
            <TouchableOpacity
              style={[
                styles.centerButton,
                {
                  backgroundColor: theme.surface,
                  shadowColor: isDark ? '#000' : '#000',
                }
              ]}
              onPress={handleCenterOnUser}
              activeOpacity={0.8}
            >
              <Ionicons name="locate" size={22} color={theme.primary.main} />
            </TouchableOpacity>
          )}

          {/* Crosshair indicator when no location selected */}
          {!selectedLocation && (
            <View style={styles.crosshairContainer} pointerEvents="none">
              <Ionicons name="add" size={32} color={theme.textTertiary} />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[
          styles.footer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 16,
          }
        ]}>
          {/* Location info */}
          {selectedLocation ? (
            <View style={[styles.locationInfo, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
              <View style={[styles.locationIconContainer, { backgroundColor: theme.primary.main }]}>
                <Ionicons name="location" size={18} color="#fff" />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>
                  Ubicación seleccionada
                </Text>
                <Text style={[styles.locationCoords, { color: theme.text }]}>
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSelectedLocation(null)}
              >
                <Ionicons name="close-circle" size={22} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.hintContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.hintText, { color: theme.textSecondary }]}>
                Toca en el mapa para seleccionar la ubicación del evento
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttons}>
            {userLocation && (
              <TouchableOpacity
                style={[
                  styles.useLocationButton,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
                ]}
                onPress={handleUseMyLocation}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate" size={18} color={theme.primary.main} />
                <Text style={[styles.useLocationText, { color: theme.primary.main }]}>
                  Usar mi ubicación
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: theme.primary.main },
                !selectedLocation && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedLocation}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirmar ubicación</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  confirmHeaderButton: {
    // Additional styling if needed
  },
  confirmHeaderButtonDisabled: {
    opacity: 0.4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerShadow: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: -6,
    opacity: 0.3,
  },
  centerButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  crosshairContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  locationCoords: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  clearButton: {
    padding: 4,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  useLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  useLocationText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
