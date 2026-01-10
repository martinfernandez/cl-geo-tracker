import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { phoneLocationApi } from './api';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_STORAGE_KEY = 'pending_locations';
const MAX_BATCH_SIZE = 5; // Batch size for uploads

// Battery-efficient settings
const BATTERY_SAVER_CONFIG = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 200, // 200 meters - much less frequent
  timeInterval: 300000, // 5 minutes
};

// Throttle on-demand requests to avoid battery drain from spam
let lastOnDemandRequest = 0;
const ON_DEMAND_THROTTLE_MS = 10000; // Minimum 10 seconds between on-demand requests

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation] Task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    console.log('[BackgroundLocation] Received', locations.length, 'locations');

    try {
      // Get auth token
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.log('[BackgroundLocation] No auth token, skipping');
        return;
      }

      // Store locations for batch upload
      const pendingLocations = await getPendingLocations();
      const newLocations = locations.map((loc) => ({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        accuracy: loc.coords.accuracy,
        timestamp: new Date(loc.timestamp).toISOString(),
      }));

      const allPending = [...pendingLocations, ...newLocations];

      // If we have enough locations, try to upload
      if (allPending.length >= MAX_BATCH_SIZE) {
        try {
          await phoneLocationApi.submitBatchPositions(allPending);
          console.log('[BackgroundLocation] Uploaded', allPending.length, 'positions');
          await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify([]));
        } catch (uploadError) {
          console.error('[BackgroundLocation] Upload failed, keeping for later:', uploadError);
          await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(allPending));
        }
      } else {
        // Store for later
        await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(allPending));
        console.log('[BackgroundLocation] Stored', allPending.length, 'pending locations');
      }
    } catch (err) {
      console.error('[BackgroundLocation] Error processing locations:', err);
    }
  }
});

async function getPendingLocations(): Promise<any[]> {
  try {
    const stored = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function requestBackgroundPermissions(): Promise<boolean> {
  try {
    // First request foreground permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('[BackgroundLocation] Foreground permission denied');
      return false;
    }

    // Then request background permissions
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('[BackgroundLocation] Background permission denied');
      return false;
    }

    console.log('[BackgroundLocation] All permissions granted');
    return true;
  } catch (error) {
    console.error('[BackgroundLocation] Error requesting permissions:', error);
    return false;
  }
}

export async function startBackgroundTracking(): Promise<boolean> {
  try {
    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      console.log('[BackgroundLocation] Already running');
      return true;
    }

    // Request permissions first
    const hasPermission = await requestBackgroundPermissions();
    if (!hasPermission) {
      return false;
    }

    // Get and submit current location immediately so user appears on map right away
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const position = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        altitude: currentLocation.coords.altitude,
        speed: currentLocation.coords.speed,
        heading: currentLocation.coords.heading,
        accuracy: currentLocation.coords.accuracy,
        timestamp: new Date(currentLocation.timestamp).toISOString(),
      };
      await phoneLocationApi.submitPosition(position);
      console.log('[BackgroundLocation] Submitted initial position');
    } catch (initialErr) {
      console.warn('[BackgroundLocation] Could not submit initial position:', initialErr);
      // Continue anyway - background task will submit later
    }

    // Start background location updates with battery-efficient settings
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: BATTERY_SAVER_CONFIG.accuracy,
      distanceInterval: BATTERY_SAVER_CONFIG.distanceInterval,
      timeInterval: BATTERY_SAVER_CONFIG.timeInterval,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Ubicación activa',
        notificationBody: 'Compartiendo tu ubicación (modo ahorro)',
        notificationColor: '#007AFF',
      },
      pausesUpdatesAutomatically: true, // Allow system to pause when stationary
      activityType: Location.ActivityType.Other, // Less aggressive than AutomotiveNavigation
    });

    console.log('[BackgroundLocation] Started tracking');
    return true;
  } catch (error) {
    console.error('[BackgroundLocation] Error starting tracking:', error);
    return false;
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[BackgroundLocation] Stopped tracking');
    }

    // Upload any pending locations
    const pendingLocations = await getPendingLocations();
    if (pendingLocations.length > 0) {
      try {
        await phoneLocationApi.submitBatchPositions(pendingLocations);
        await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify([]));
        console.log('[BackgroundLocation] Uploaded pending locations on stop');
      } catch (error) {
        console.error('[BackgroundLocation] Failed to upload pending on stop:', error);
      }
    }
  } catch (error) {
    console.error('[BackgroundLocation] Error stopping tracking:', error);
  }
}

export async function isBackgroundTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function flushPendingLocations(): Promise<void> {
  try {
    const pendingLocations = await getPendingLocations();
    if (pendingLocations.length > 0) {
      await phoneLocationApi.submitBatchPositions(pendingLocations);
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify([]));
      console.log('[BackgroundLocation] Flushed', pendingLocations.length, 'pending locations');
    }
  } catch (error) {
    console.error('[BackgroundLocation] Error flushing pending locations:', error);
  }
}

/**
 * Start foreground-only location tracking (no background permissions required)
 * Uses only "while using the app" permission - location updates stop when app is backgrounded
 */
export async function startForegroundTracking(): Promise<boolean> {
  try {
    // Only request foreground permissions (while using the app)
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[BackgroundLocation] Foreground permission denied');
      return false;
    }

    // Get and submit current location immediately
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const position = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        altitude: currentLocation.coords.altitude,
        speed: currentLocation.coords.speed,
        heading: currentLocation.coords.heading,
        accuracy: currentLocation.coords.accuracy,
        timestamp: new Date(currentLocation.timestamp).toISOString(),
      };
      await phoneLocationApi.submitPosition(position);
      console.log('[BackgroundLocation] Submitted initial foreground position');
    } catch (initialErr) {
      console.warn('[BackgroundLocation] Could not submit initial foreground position:', initialErr);
    }

    console.log('[BackgroundLocation] Foreground tracking ready (no background updates)');
    return true;
  } catch (error) {
    console.error('[BackgroundLocation] Error starting foreground tracking:', error);
    return false;
  }
}

/**
 * Get and submit location on-demand (called when server requests it)
 * This is throttled to prevent battery drain from spam requests
 */
export async function submitLocationOnDemand(): Promise<boolean> {
  const now = Date.now();

  // Throttle requests
  if (now - lastOnDemandRequest < ON_DEMAND_THROTTLE_MS) {
    console.log('[BackgroundLocation] On-demand request throttled');
    return false;
  }

  lastOnDemandRequest = now;

  try {
    // Check if we have permission
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[BackgroundLocation] No location permission for on-demand');
      return false;
    }

    // Get current location with balanced accuracy (faster, less battery)
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const position = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      speed: location.coords.speed,
      heading: location.coords.heading,
      accuracy: location.coords.accuracy,
      timestamp: new Date(location.timestamp).toISOString(),
    };

    await phoneLocationApi.submitPosition(position);
    console.log('[BackgroundLocation] Submitted on-demand position');
    return true;
  } catch (error) {
    console.error('[BackgroundLocation] Error submitting on-demand location:', error);
    return false;
  }
}
