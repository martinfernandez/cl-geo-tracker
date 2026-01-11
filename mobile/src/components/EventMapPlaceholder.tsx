import React from 'react';
import { View, StyleSheet, Image as RNImage, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '../contexts/ThemeContext';

interface EventMapPlaceholderProps {
  latitude: number;
  longitude: number;
  style?: ViewStyle;
  markerColor?: string;
}

/**
 * A static map placeholder for events without images.
 * Shows the event location with a watermark of the app logo.
 * Respects dark/light mode for the map style.
 */
export function EventMapPlaceholder({
  latitude,
  longitude,
  style,
  markerColor = '#8B5CF6',
}: EventMapPlaceholderProps) {
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        liteMode={true} // Use lite mode for better performance
        pointerEvents="none"
      >
        <Marker
          coordinate={{ latitude, longitude }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={[styles.marker, { backgroundColor: markerColor }]}>
            <View style={styles.markerInner} />
          </View>
          <View style={[styles.markerShadow, { backgroundColor: markerColor }]} />
        </Marker>
      </MapView>

      {/* App Logo Watermark */}
      <View style={styles.watermarkContainer}>
        <RNImage
          source={require('../../assets/icon.png')}
          style={styles.watermark}
          resizeMode="contain"
        />
      </View>

      {/* Subtle gradient overlay to ensure logo visibility */}
      <View style={[
        styles.gradientOverlay,
        isDark ? styles.gradientOverlayDark : styles.gradientOverlayLight
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: 180,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  markerShadow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -4,
    opacity: 0.3,
    alignSelf: 'center',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  watermark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    opacity: 0.85,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 60,
    borderBottomRightRadius: 40,
  },
  gradientOverlayLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  gradientOverlayDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});
