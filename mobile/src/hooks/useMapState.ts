import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { eventApi, api, areaApi, groupApi, deviceApi, Event } from '../services/api';
import { useDeviceStore } from '../store/useDeviceStore';
import { useGroupStore } from '../store/useGroupStore';
import { usePeekMode } from '../contexts/PeekModeContext';
import { useMapStore } from '../store/useMapStore';
import MapView from 'react-native-maps';

// Default region (Buenos Aires)
const DEFAULT_REGION: Region = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

// Polling intervals
const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds
const LOCATION_DISTANCE_INTERVAL = 10; // 10 meters
const DATA_REFRESH_INTERVAL = 30000; // 30 seconds
const REGION_CHANGE_DEBOUNCE = 500; // 500ms

interface EventFilters {
  status: string;
  type: string;
  sortBy: string;
  sortOrder: string;
}

interface AreaOfInterest {
  latitude: number;
  longitude: number;
  radius: number;
}

interface SelectedArea extends AreaOfInterest {
  name: string;
}

interface UserProfile {
  name: string;
  email: string;
}

interface TrackedPositions {
  [eventId: string]: Array<{ latitude: number; longitude: number }>;
}

interface UseMapStateOptions {
  navigation: any;
  route: any;
}

export function useMapState({ navigation, route }: UseMapStateOptions) {
  const { devices, setDevices } = useDeviceStore();
  const { activeGroup, clearActiveGroup } = useGroupStore();
  const { isPeekMode, togglePeekMode } = usePeekMode();
  const pendingCenterArea = useMapStore((state) => state.pendingCenterArea);
  const clearPendingCenterArea = useMapStore((state) => state.clearPendingCenterArea);

  // Refs for cleanup and avoiding stale closures
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const regionChangeTimeout = useRef<NodeJS.Timeout | null>(null);
  const dataRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const groupDataInterval = useRef<NodeJS.Timeout | null>(null);
  const trackedPositionsInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isLoadingEvents = useRef(false);
  const isLoadingGroupData = useRef(false);
  const isLoadingTrackedPositions = useRef(false);

  // Core state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasInitializedMap, setHasInitializedMap] = useState(false);

  // Event state
  const [events, setEvents] = useState<Event[]>([]);
  const [pinnedEvents, setPinnedEvents] = useState<Event[]>([]);
  const [trackedEventPositions, setTrackedEventPositions] = useState<TrackedPositions>({});

  // Group state
  const [groupPositions, setGroupPositions] = useState<any[]>([]);
  const [groupEvents, setGroupEvents] = useState<Event[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);

  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [feedMinimized, setFeedMinimized] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);

  // Data state
  const [filters, setFilters] = useState<EventFilters>({
    status: 'ALL',
    type: 'ALL',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [areaOfInterest, setAreaOfInterest] = useState<AreaOfInterest | null>(null);
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [totalPendingRequests, setTotalPendingRequests] = useState(0);

  // ============ SAFE STATE UPDATERS ============
  // These functions check if component is still mounted before updating state

  const safeSetState = useCallback(<T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
    if (isMounted.current) {
      setter(value);
    }
  }, []);

  // ============ DATA LOADING FUNCTIONS ============

  const loadDevices = useCallback(async () => {
    try {
      const data = await deviceApi.getAll();
      safeSetState(setDevices, data);
    } catch (error) {
      console.error('[useMapState] Error loading devices:', error);
    }
  }, [setDevices, safeSetState]);

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await api.get('/users/profile');
      if (!isMounted.current) return;

      if (response.data.name && response.data.email) {
        setUserProfile({
          name: response.data.name,
          email: response.data.email,
        });
      }

      if (
        response.data.areaOfInterestLatitude &&
        response.data.areaOfInterestLongitude &&
        response.data.areaOfInterestRadius
      ) {
        setAreaOfInterest({
          latitude: response.data.areaOfInterestLatitude,
          longitude: response.data.areaOfInterestLongitude,
          radius: response.data.areaOfInterestRadius,
        });
      }
    } catch (error) {
      console.error('[useMapState] Error loading profile:', error);
    }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    try {
      const areas = await areaApi.getMyAreas();
      if (!isMounted.current) return;
      const total = areas.reduce((sum: number, area: any) => sum + (area.pendingRequestsCount || 0), 0);
      setTotalPendingRequests(total);
    } catch (error) {
      console.error('[useMapState] Error loading pending requests:', error);
    }
  }, []);

  const loadEvents = useCallback(async (region?: Region) => {
    // Prevent concurrent calls
    if (isLoadingEvents.current) return;

    const targetRegion = region || mapRegion;
    if (!targetRegion) return;

    isLoadingEvents.current = true;

    try {
      const { latitude, longitude, latitudeDelta, longitudeDelta } = targetRegion;
      const northEast = `${latitude + latitudeDelta / 2},${longitude + longitudeDelta / 2}`;
      const southWest = `${latitude - latitudeDelta / 2},${longitude - longitudeDelta / 2}`;

      const params: any = {
        northEast,
        southWest,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.type !== 'ALL') params.type = filters.type;

      const data = await eventApi.getPublicByRegion(params);
      // DEBUG: Log API response to check media data
      console.log('[useMapState] API response:', data.length, 'events');
      if (data.length > 0) {
        console.log('[useMapState] First event media check:', {
          id: data[0].id?.substring(0, 8),
          hasMedia: !!data[0].media,
          mediaLength: data[0].media?.length,
          imageUrl: data[0].imageUrl?.substring(0, 50),
        });
      }
      if (!isMounted.current) return;

      // Update pinned events (events with active traces)
      const newPinnedEvents = data.filter(
        (e: any) => e.realTimeTracking && e.status === 'IN_PROGRESS'
      );

      setPinnedEvents((prev) => {
        const closedEventIds = data
          .filter((e: any) => e.status === 'CLOSED')
          .map((e: any) => e.id);

        const existingPinnedNotInData = prev.filter(
          (pe: any) =>
            !data.some((e: any) => e.id === pe.id) &&
            pe.status === 'IN_PROGRESS' &&
            !closedEventIds.includes(pe.id)
        );

        const merged = [...newPinnedEvents];
        existingPinnedNotInData.forEach((pe: any) => {
          if (!merged.some((e: any) => e.id === pe.id)) {
            merged.push(pe);
          }
        });
        return merged;
      });

      // Clean up tracked positions for closed events
      setTrackedEventPositions((prev) => {
        const updatedPositions = { ...prev };
        data.forEach((event: any) => {
          if (event.status === 'CLOSED' && updatedPositions[event.id]) {
            delete updatedPositions[event.id];
          }
        });
        return updatedPositions;
      });

      setEvents(data);
    } catch (error) {
      console.error('[useMapState] Error loading events:', error);
    } finally {
      isLoadingEvents.current = false;
    }
  }, [mapRegion, filters]);

  const loadGroupData = useCallback(async () => {
    if (!activeGroup || isLoadingGroupData.current) return;

    isLoadingGroupData.current = true;

    try {
      const [positionsData, eventsData] = await Promise.all([
        groupApi.getPositions(activeGroup.id),
        groupApi.getEvents(activeGroup.id),
      ]);

      if (!isMounted.current) return;

      setGroupPositions(positionsData);
      setGroupEvents(eventsData);
    } catch (error) {
      console.error('[useMapState] Error loading group data:', error);
    } finally {
      isLoadingGroupData.current = false;
    }
  }, [activeGroup]);

  const loadTrackedEventPositions = useCallback(async (eventsToTrack: Event[]) => {
    if (isLoadingTrackedPositions.current) return;

    const trackedEvents = eventsToTrack.filter(
      (event: any) => event.realTimeTracking && event.status === 'IN_PROGRESS'
    );

    if (trackedEvents.length === 0) {
      setTrackedEventPositions({});
      return;
    }

    isLoadingTrackedPositions.current = true;

    try {
      const positionsData: TrackedPositions = {};
      const deletedEventIds: string[] = [];

      await Promise.all(
        trackedEvents.map(async (event: any) => {
          try {
            const data = await eventApi.getEventPositions(event.id);
            if (data.positions && data.positions.length > 0) {
              positionsData[event.id] = data.positions.map((pos: any) => ({
                latitude: Number(pos.latitude),
                longitude: Number(pos.longitude),
              }));
            }
          } catch (error: any) {
            // If event returns 404, it was deleted - mark for removal from pinnedEvents
            if (error?.response?.status === 404) {
              console.log(`[useMapState] Event ${event.id} not found (deleted), removing from pinned`);
              deletedEventIds.push(event.id);
            } else {
              console.error(`[useMapState] Error loading positions for event ${event.id}:`, error);
            }
          }
        })
      );

      if (isMounted.current) {
        setTrackedEventPositions(positionsData);

        // Remove deleted events from pinnedEvents and events
        if (deletedEventIds.length > 0) {
          setPinnedEvents((prev) => prev.filter((e) => !deletedEventIds.includes(e.id)));
          setEvents((prev) => prev.filter((e) => !deletedEventIds.includes(e.id)));
        }
      }
    } catch (error) {
      console.error('[useMapState] Error loading tracked event positions:', error);
    } finally {
      isLoadingTrackedPositions.current = false;
    }
  }, []);

  // ============ LOCATION TRACKING ============

  const startLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[useMapState] Location permission denied');
        return;
      }

      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (isMounted.current) {
        setUserLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        });
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: LOCATION_DISTANCE_INTERVAL,
        },
        (location) => {
          if (isMounted.current) {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        }
      );
    } catch (error) {
      console.error('[useMapState] Error starting location tracking:', error);
    }
  }, []);

  // ============ EVENT HANDLERS ============

  const handlePeekModeToggle = useCallback(() => {
    if (isPeekMode && userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800
      );
    }
    togglePeekMode();
  }, [isPeekMode, userLocation, togglePeekMode]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    if (regionChangeTimeout.current) {
      clearTimeout(regionChangeTimeout.current);
    }

    regionChangeTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        setMapRegion(region);
      }
    }, REGION_CHANGE_DEBOUNCE);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadDevices(), loadEvents()]);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [loadDevices, loadEvents]);

  const handleFilterApply = useCallback((newFilters: EventFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSelectMember = useCallback((position: any) => {
    setSelectedMember(position);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800
      );
    }

    // Clear selection after 10 seconds
    setTimeout(() => {
      if (isMounted.current) {
        setSelectedMember(null);
      }
    }, 10000);
  }, []);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const centerOnUserLocation = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800
      );
    }
  }, [userLocation]);

  // ============ COMPUTED VALUES ============

  const allVisibleEvents = useMemo(() => {
    const combined = [...events];
    pinnedEvents.forEach((pe: any) => {
      if (!combined.some((e: any) => e.id === pe.id)) {
        combined.push(pe);
      }
    });
    return combined;
  }, [events, pinnedEvents]);

  const displayEvents = useMemo(() => {
    if (activeGroup) {
      // In group mode, show group events BUT also include urgent events with active tracking
      const urgentTrackedEvents = pinnedEvents.filter(
        (e: any) => e.isUrgent && e.realTimeTracking && e.status === 'IN_PROGRESS'
      );
      // Merge without duplicates
      const combined = [...groupEvents];
      urgentTrackedEvents.forEach((ue: any) => {
        if (!combined.some((e: any) => e.id === ue.id)) {
          combined.push(ue);
        }
      });
      return combined;
    }
    return allVisibleEvents;
  }, [activeGroup, groupEvents, allVisibleEvents, pinnedEvents]);

  const trackedEventIds = useMemo(() => {
    // Get events with real-time tracking that are in progress
    let eventsToTrack = allVisibleEvents.filter(
      (event: any) => event.realTimeTracking && event.status === 'IN_PROGRESS'
    );

    // In group mode, also include urgent tracked events from pinnedEvents
    if (activeGroup) {
      const urgentTrackedEvents = pinnedEvents.filter(
        (e: any) => e.isUrgent && e.realTimeTracking && e.status === 'IN_PROGRESS'
      );
      urgentTrackedEvents.forEach((ue: any) => {
        if (!eventsToTrack.some((e: any) => e.id === ue.id)) {
          eventsToTrack.push(ue);
        }
      });
    }

    return eventsToTrack.map((event: any) => event.id).sort().join(',');
  }, [allVisibleEvents, activeGroup, pinnedEvents]);

  const devicesWithPosition = useMemo(() => {
    return devices.filter((device: any) => {
      const lastPosition = device.positions?.[0];
      return lastPosition && lastPosition.latitude && lastPosition.longitude;
    });
  }, [devices]);

  // ============ EFFECTS ============

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (regionChangeTimeout.current) {
        clearTimeout(regionChangeTimeout.current);
      }
      if (dataRefreshInterval.current) {
        clearInterval(dataRefreshInterval.current);
      }
      if (groupDataInterval.current) {
        clearInterval(groupDataInterval.current);
      }
      if (trackedPositionsInterval.current) {
        clearInterval(trackedPositionsInterval.current);
      }
    };
  }, []);

  // Location tracking - runs once on mount
  useEffect(() => {
    startLocationTracking();
  }, [startLocationTracking]);

  // Initial data loading
  useEffect(() => {
    loadDevices();
    loadUserProfile();
  }, [loadDevices, loadUserProfile]);

  // Data refresh interval - devices always refresh, events only when peek mode is active
  useEffect(() => {
    dataRefreshInterval.current = setInterval(() => {
      loadDevices();
    }, DATA_REFRESH_INTERVAL);

    return () => {
      if (dataRefreshInterval.current) {
        clearInterval(dataRefreshInterval.current);
      }
    };
  }, [loadDevices]);

  // Separate interval for events refresh (only when peek mode is active)
  useEffect(() => {
    if (!isPeekMode || activeGroup) return;

    const eventsInterval = setInterval(() => {
      if (mapRegion) {
        loadEvents();
      }
    }, DATA_REFRESH_INTERVAL);

    return () => {
      clearInterval(eventsInterval);
    };
  }, [loadEvents, mapRegion, isPeekMode, activeGroup]);

  // Load events when map is ready AND peek mode is active
  useEffect(() => {
    if (isMapReady && mapRegion && isPeekMode && !activeGroup) {
      loadEvents();
    } else if (!isPeekMode && !activeGroup) {
      // Clear events when peek mode is disabled
      setEvents([]);
      setPinnedEvents([]);
      setTrackedEventPositions({});
    }
  }, [isMapReady, mapRegion, isPeekMode, activeGroup, loadEvents]);

  // Reload events when filters change (only if peek mode is active)
  useEffect(() => {
    if (isMapReady && mapRegion && isPeekMode && !activeGroup) {
      loadEvents();
    }
  }, [filters, isMapReady, mapRegion, isPeekMode, activeGroup, loadEvents]);

  // Handle group mode changes - use ref to track previous value
  const prevActiveGroupRef = useRef(activeGroup);
  useEffect(() => {
    const wasInGroupMode = prevActiveGroupRef.current !== null && prevActiveGroupRef.current !== undefined;
    const isInGroupMode = activeGroup !== null && activeGroup !== undefined;

    // Only act on actual changes
    if (isInGroupMode && !wasInGroupMode) {
      // ENTERING GROUP MODE
      // Keep urgent tracked events in pinnedEvents, clear non-urgent ones
      setPinnedEvents((prev) =>
        prev.filter((e: any) => e.isUrgent && e.realTimeTracking && e.status === 'IN_PROGRESS')
      );
      setEvents([]);
      setFeedMinimized(true);
      loadGroupData();

      groupDataInterval.current = setInterval(loadGroupData, DATA_REFRESH_INTERVAL);
    } else if (!isInGroupMode && wasInGroupMode) {
      // EXITING GROUP MODE (only when actually exiting, not on mount)
      setGroupPositions([]);
      setGroupEvents([]);
      setSelectedMember(null);
      setTrackedEventPositions({});
      setPinnedEvents([]);
      // NOTE: Removed setMapKey increment - it was causing full MapView remount and flickering

      // Reload events when exiting group mode
      if (mapRegion) {
        loadEvents();
      }
    } else if (isInGroupMode) {
      // Still in group mode, refresh data
      loadGroupData();
    }

    prevActiveGroupRef.current = activeGroup;

    return () => {
      if (groupDataInterval.current) {
        clearInterval(groupDataInterval.current);
      }
    };
  }, [activeGroup]);

  // Handle screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserProfile();
      loadPendingRequests();
      if (activeGroup) {
        loadGroupData();
      }
    });
    return unsubscribe;
  }, [navigation, activeGroup, loadUserProfile, loadPendingRequests, loadGroupData]);

  // Handle refresh parameter from navigation
  useEffect(() => {
    if (route.params?.refresh) {
      loadDevices();
      loadEvents();
      loadUserProfile();
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh, loadDevices, loadEvents, loadUserProfile, navigation]);

  // Handle pending center area from store
  useEffect(() => {
    if (pendingCenterArea) {
      const { latitude, longitude, radius, name } = pendingCenterArea;
      clearPendingCenterArea();
      setFeedMinimized(true);
      setSelectedArea({ latitude, longitude, radius, name });

      const radiusInKm = radius / 1000;
      const latitudeDelta = radiusInKm / 111;
      const longitudeDelta = radiusInKm / (111 * Math.cos(latitude * (Math.PI / 180)));

      const region = {
        latitude,
        longitude,
        latitudeDelta: latitudeDelta * 2.5,
        longitudeDelta: longitudeDelta * 2.5,
      };

      setTimeout(() => {
        if (mapRef.current && isMounted.current) {
          mapRef.current.animateToRegion(region, 1000);
        }
      }, 500);
    }
  }, [pendingCenterArea, clearPendingCenterArea]);

  // Initialize map to area of interest or user location
  useEffect(() => {
    if (hasInitializedMap || !mapRef.current) return;

    // Priority 1: Center on area of interest if configured
    if (areaOfInterest) {
      const radiusInDegrees = areaOfInterest.radius / 111320;

      const newRegion = {
        latitude: areaOfInterest.latitude,
        longitude: areaOfInterest.longitude,
        latitudeDelta: radiusInDegrees * 2.5,
        longitudeDelta: radiusInDegrees * 2.5,
      };

      setMapRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 1000);
      setHasInitializedMap(true);
      return;
    }

    // Priority 2: Center on user location if available
    if (userLocation) {
      const newRegion = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setMapRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 1000);
      setHasInitializedMap(true);
    }
  }, [areaOfInterest, userLocation, hasInitializedMap]);

  // Load tracked event positions
  useEffect(() => {
    if (trackedEventIds) {
      // Build the list of events to track positions for
      let eventsForTracking = allVisibleEvents.filter(
        (e: any) => e.realTimeTracking && e.status === 'IN_PROGRESS'
      );

      // In group mode, also include urgent tracked events from pinnedEvents
      if (activeGroup) {
        const urgentTrackedEvents = pinnedEvents.filter(
          (e: any) => e.isUrgent && e.realTimeTracking && e.status === 'IN_PROGRESS'
        );
        urgentTrackedEvents.forEach((ue: any) => {
          if (!eventsForTracking.some((e: any) => e.id === ue.id)) {
            eventsForTracking.push(ue);
          }
        });
      }

      loadTrackedEventPositions(eventsForTracking);

      trackedPositionsInterval.current = setInterval(() => {
        loadTrackedEventPositions(eventsForTracking);
      }, DATA_REFRESH_INTERVAL);

      return () => {
        if (trackedPositionsInterval.current) {
          clearInterval(trackedPositionsInterval.current);
        }
      };
    } else {
      setTrackedEventPositions({});
    }
  }, [trackedEventIds, activeGroup, allVisibleEvents, pinnedEvents, loadTrackedEventPositions]);

  return {
    // Refs
    mapRef,

    // Core state
    userLocation,
    mapRegion,
    isMapReady,

    // Event state
    events,
    pinnedEvents,
    trackedEventPositions,
    displayEvents,
    allVisibleEvents,

    // Group state
    activeGroup,
    clearActiveGroup,
    groupPositions,
    groupEvents,
    selectedMember,
    showGroupMembersModal,
    setShowGroupMembersModal,

    // UI state
    refreshing,
    showFilterModal,
    setShowFilterModal,
    showMenu,
    setShowMenu,
    feedMinimized,
    showRoutes,
    setShowRoutes,

    // Data state
    filters,
    areaOfInterest,
    selectedArea,
    setSelectedArea,
    userProfile,
    totalPendingRequests,
    devices,
    devicesWithPosition,

    // Context values
    isPeekMode,

    // Handlers
    handlePeekModeToggle,
    handleRegionChangeComplete,
    handleRefresh,
    handleFilterApply,
    handleSelectMember,
    handleMapReady,
    centerOnUserLocation,

    // Data loaders (for manual refresh)
    loadEvents,
    loadGroupData,
  };
}
