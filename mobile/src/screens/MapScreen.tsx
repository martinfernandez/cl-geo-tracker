import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated, Modal, Platform } from 'react-native';
import MapView, { Marker, Callout, Circle, Region, Polyline } from 'react-native-maps';
import { useDeviceStore } from '../store/useDeviceStore';
import { deviceApi, eventApi, api, Event, areaApi } from '../services/api';
import SlidingEventFeed from '../components/SlidingEventFeed';
import EventFilterModal from '../components/EventFilterModal';
import { PulsingMarker } from '../components/PulsingMarker';
import { Ionicons } from '@expo/vector-icons';

export function MapScreen({ navigation, route }: any) {
  const { devices, setDevices, updateDevice } = useDeviceStore();
  const mapRef = useRef<MapView>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'ALL',
    type: 'ALL',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [areaOfInterest, setAreaOfInterest] = useState<{
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);
  const [selectedArea, setSelectedArea] = useState<{
    latitude: number;
    longitude: number;
    radius: number;
    name: string;
  } | null>(null);
  const regionChangeTimeout = useRef<NodeJS.Timeout | null>(null);
  const [trackedEventPositions, setTrackedEventPositions] = useState<{
    [eventId: string]: Array<{ latitude: number; longitude: number }>;
  }>({});
  const [showMenu, setShowMenu] = useState(false);
  const [totalPendingRequests, setTotalPendingRequests] = useState(0);

  useEffect(() => {
    loadDevices();
    loadUserProfile();

    const interval = setInterval(() => {
      loadDevices();
      if (mapRegion) {
        loadEvents();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      if (regionChangeTimeout.current) {
        clearTimeout(regionChangeTimeout.current);
      }
    };
  }, []);

  // Handle refresh parameter from navigation
  useEffect(() => {
    if (route.params?.refresh) {
      loadDevices();
      loadEvents();
      loadUserProfile(); // Reload area of interest
      // Reset the param to avoid triggering on every render
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh]);

  // Handle centerArea parameter from navigation
  useEffect(() => {
    if (route.params?.centerArea && mapRef.current) {
      const { latitude, longitude, radius, name } = route.params.centerArea;

      // Set the selected area to display it on map
      setSelectedArea({ latitude, longitude, radius, name });

      // Calculate region based on radius to show the entire area
      const radiusInKm = radius / 1000;
      const latitudeDelta = radiusInKm / 111; // 1 degree latitude ≈ 111 km
      const longitudeDelta = radiusInKm / (111 * Math.cos(latitude * (Math.PI / 180)));

      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: latitudeDelta * 2.5, // Add some padding
          longitudeDelta: longitudeDelta * 2.5,
        },
        1000
      );

      // Reset the param to avoid triggering on every render
      navigation.setParams({ centerArea: undefined });
    }
  }, [route.params?.centerArea]);

  // Reload area of interest and pending requests when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserProfile();
      loadPendingRequests();
    });
    return unsubscribe;
  }, [navigation]);

  // Load events when map region is set for the first time
  useEffect(() => {
    if (mapRegion) {
      loadEvents();
    } else {
      // If mapRegion hasn't been set yet, set it to initial region to trigger load
      const initialRegion = {
        latitude: -34.6037,
        longitude: -58.3816,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
      setMapRegion(initialRegion);
    }
  }, [mapRegion]);

  // Fit map to area of interest when loaded
  useEffect(() => {
    if (areaOfInterest && mapRef.current) {
      // Calculate the region to show the full area of interest
      // Convert radius from meters to degrees (approximate)
      const radiusInDegrees = areaOfInterest.radius / 111320; // 1 degree ≈ 111.32km

      mapRef.current.animateToRegion({
        latitude: areaOfInterest.latitude,
        longitude: areaOfInterest.longitude,
        latitudeDelta: radiusInDegrees * 2.5, // Add some padding
        longitudeDelta: radiusInDegrees * 2.5,
      }, 1000);
    }
  }, [areaOfInterest]);

  const loadDevices = async () => {
    try {
      const data = await deviceApi.getAll();
      setDevices(data);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/users/profile');
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
      console.error('Error loading profile:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const areas = await areaApi.getMyAreas();
      const total = areas.reduce((sum, area) => sum + (area.pendingRequestsCount || 0), 0);
      setTotalPendingRequests(total);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadEvents = async () => {
    try {
      if (!mapRegion) return;

      const { latitude, longitude, latitudeDelta, longitudeDelta } = mapRegion;
      const northEast = `${latitude + latitudeDelta / 2},${longitude + longitudeDelta / 2}`;
      const southWest = `${latitude - latitudeDelta / 2},${longitude - longitudeDelta / 2}`;

      const params: any = {
        northEast,
        southWest,
      };

      if (filters.status !== 'ALL') {
        params.status = filters.status;
      }

      if (filters.type !== 'ALL') {
        params.type = filters.type;
      }

      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder;

      const data = await eventApi.getPublicByRegion(params);
      console.log('Loaded events:', data.map((e: any) => ({
        id: e.id,
        type: e.type,
        realTimeTracking: e.realTimeTracking,
        status: e.status,
        deviceId: e.deviceId
      })));
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadTrackedEventPositions = async () => {
    try {
      // Filter events with real-time tracking enabled
      const trackedEvents = events.filter(
        (event: any) => event.realTimeTracking && event.status === 'IN_PROGRESS'
      );

      console.log(`[TRACKING] Found ${trackedEvents.length} tracked events:`, trackedEvents.map((e: any) => ({
        id: e.id,
        type: e.type,
        isUrgent: e.isUrgent,
        realTimeTracking: e.realTimeTracking,
        status: e.status
      })));

      if (trackedEvents.length === 0) {
        console.log('[TRACKING] No tracked events found - clearing positions');
        setTrackedEventPositions({});
        return;
      }

      // Create a completely new object to avoid reference issues
      const positionsData: { [key: string]: Array<{ latitude: number; longitude: number }> } = {};

      await Promise.all(
        trackedEvents.map(async (event: any) => {
          try {
            console.log(`[TRACKING] Loading positions for event ${event.id}...`);
            const data = await eventApi.getEventPositions(event.id);
            console.log(`[TRACKING] Event ${event.id}: Received ${data.positions?.length || 0} positions`);

            if (data.positions && data.positions.length > 0) {
              // Create a new array with new objects to avoid any reference issues
              positionsData[event.id] = data.positions.map((pos: any) => ({
                latitude: Number(pos.latitude),
                longitude: Number(pos.longitude),
              }));
              console.log(`[TRACKING] Event ${event.id}: Mapped ${positionsData[event.id].length} positions`);
              console.log(`[TRACKING] Event ${event.id}: First position:`, positionsData[event.id][0]);
              console.log(`[TRACKING] Event ${event.id}: Last position:`, positionsData[event.id][positionsData[event.id].length - 1]);
            } else {
              console.log(`[TRACKING] Event ${event.id}: No positions received`);
            }
          } catch (error) {
            console.error(`[TRACKING] Error loading positions for event ${event.id}:`, error);
          }
        })
      );

      console.log('[TRACKING] Setting tracked event positions - Total events:', Object.keys(positionsData).length);
      console.log('[TRACKING] Position counts:', Object.entries(positionsData).map(([id, pos]) => `${id}: ${pos.length}`));

      // Replace the entire state with the new data
      setTrackedEventPositions(positionsData);
      console.log('[TRACKING] State updated with', Object.keys(positionsData).length, 'tracked events');
    } catch (error) {
      console.error('[TRACKING] Error loading tracked event positions:', error);
    }
  };

  const handleRegionChangeComplete = (region: Region) => {
    // Clear previous timeout
    if (regionChangeTimeout.current) {
      clearTimeout(regionChangeTimeout.current);
    }

    // Set new timeout to update region after user stops moving
    regionChangeTimeout.current = setTimeout(() => {
      setMapRegion(region);
    }, 500); // Wait 500ms after user stops moving
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDevices(), loadEvents()]);
    setRefreshing(false);
  };

  const handleFilterApply = (newFilters: any) => {
    setFilters(newFilters);
  };

  useEffect(() => {
    if (mapRegion) {
      loadEvents();
    }
  }, [mapRegion, filters]);

  // Get tracked event IDs using useMemo to prevent unnecessary recalculations
  const trackedEventIds = useMemo(() => {
    return events
      .filter((event: any) => event.realTimeTracking && event.status === 'IN_PROGRESS')
      .map((event: any) => event.id)
      .sort()
      .join(',');
  }, [events]);

  // Load tracked event positions when tracked event IDs change
  useEffect(() => {
    if (trackedEventIds) {
      loadTrackedEventPositions();
    } else {
      setTrackedEventPositions({});
    }
  }, [trackedEventIds]);

  // Poll tracked event positions every 30 seconds
  useEffect(() => {
    if (!trackedEventIds) {
      return;
    }

    const interval = setInterval(() => {
      loadTrackedEventPositions();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [trackedEventIds]);

  // Filter devices with valid positions
  const devicesWithPosition = devices.filter((device: any) => {
    const lastPosition = device.positions?.[0];
    return lastPosition && lastPosition.latitude && lastPosition.longitude;
  });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: -34.6037,
          longitude: -58.3816,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* Area of Interest Circle */}
        {areaOfInterest && (
          <Circle
            center={{
              latitude: areaOfInterest.latitude,
              longitude: areaOfInterest.longitude,
            }}
            radius={areaOfInterest.radius}
            fillColor="rgba(0, 122, 255, 0.1)"
            strokeColor="rgba(0, 122, 255, 0.5)"
            strokeWidth={2}
          />
        )}

        {/* Selected Area Circle (from "Ver" button) */}
        {selectedArea && (
          <>
            <Circle
              center={{
                latitude: selectedArea.latitude,
                longitude: selectedArea.longitude,
              }}
              radius={selectedArea.radius}
              fillColor="rgba(255, 59, 48, 0.15)"
              strokeColor="rgba(255, 59, 48, 0.6)"
              strokeWidth={2}
            />
            <Marker
              coordinate={{
                latitude: selectedArea.latitude,
                longitude: selectedArea.longitude,
              }}
              pinColor="#FF3B30"
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{selectedArea.name}</Text>
                  <Text style={styles.calloutText}>
                    Radio: {(selectedArea.radius / 1000).toFixed(1)} km
                  </Text>
                </View>
              </Callout>
            </Marker>
          </>
        )}

        {/* Device Markers */}
        {devicesWithPosition.map((device: any) => {
          const position = device.positions[0];

          return (
            <Marker
              key={device.id}
              coordinate={{
                latitude: position.latitude,
                longitude: position.longitude,
              }}
              rotation={position.heading || 0}
              pinColor="blue"
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    {device.name || device.imei}
                  </Text>
                  <Text style={styles.calloutText}>
                    IMEI: {device.imei}
                  </Text>
                  {position.speed !== null && (
                    <Text style={styles.calloutText}>
                      Velocidad: {position.speed.toFixed(1)} km/h
                    </Text>
                  )}
                  <Text style={styles.calloutText}>
                    {new Date(position.timestamp).toLocaleString('es')}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Event Markers (public events from region) */}
        {events.map((event: any) => {
          const isActiveUrgent = event.isUrgent && event.status === 'IN_PROGRESS';

          return (
            <Marker
              key={`public-event-${event.id}`}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              {isActiveUrgent ? (
                <PulsingMarker size={16} color="#FF3B30" />
              ) : (
                <View
                  style={[
                    styles.eventMarker,
                    { backgroundColor: event.isUrgent ? '#FF3B30' : '#FF9500' },
                  ]}
                />
              )}
              <Callout>
                <View style={styles.callout}>
                  <Text style={[styles.calloutTitle, event.isUrgent && styles.urgentTitle]}>
                    {event.isUrgent && '🚨 URGENTE: '}
                    {event.realTimeTracking && '📍 '}
                    {event.type}
                  </Text>
                  <Text style={styles.calloutText}>
                    {event.description}
                  </Text>
                  <Text style={styles.calloutText}>
                    Estado: {event.status === 'IN_PROGRESS' ? 'En Progreso' : 'Cerrado'}
                  </Text>
                  {event.realTimeTracking && (
                    <Text style={styles.calloutText}>
                      🔴 Rastreo en tiempo real activo
                    </Text>
                  )}
                  <Text style={styles.calloutText}>
                    {new Date(event.createdAt).toLocaleString('es')}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Polylines for tracked events */}
        {Object.keys(trackedEventPositions).map((eventId) => {
          const positions = trackedEventPositions[eventId];

          console.log(`[RENDER] Event ${eventId}: ${positions?.length || 0} positions in state`);

          if (!positions || positions.length < 2) {
            console.log(`[RENDER] Skipping polyline for event ${eventId} - insufficient positions (need at least 2, have ${positions?.length || 0})`);
            return null;
          }

          console.log(`[RENDER] Rendering polyline for event ${eventId} with ${positions.length} positions`);

          return (
            <Polyline
              key={`route-${eventId}`}
              coordinates={positions}
              strokeColor="#FF3B30"
              strokeWidth={4}
              geodesic={true}
              lineCap="round"
              lineJoin="round"
              strokeColors={['#FF3B30']}
            />
          );
        })}
      </MapView>

      {devicesWithPosition.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>
            No hay dispositivos con posición disponible
          </Text>
        </View>
      )}

      <SlidingEventFeed
        events={events}
        onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onFilterPress={() => setShowFilterModal(true)}
        onCommentPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
      />

      <EventFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        initialFilters={filters}
      />

      {/* Hamburger Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowMenu(true)}
      >
        <Ionicons name="menu" size={28} color="#262626" />
      </TouchableOpacity>

      {/* Menu Modal - Instagram Style Bottom Sheet */}
      <Modal
        visible={showMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuBottomSheet}>
            {/* Handle Bar */}
            <View style={styles.sheetHandle} />

            <View style={styles.menuItems}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('AreasList');
                }}
              >
                <Ionicons name="location-outline" size={26} color="#262626" />
                <Text style={styles.menuItemText}>Mis Áreas de Interés</Text>
                <View style={styles.menuItemRight}>
                  {totalPendingRequests > 0 && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{totalPendingRequests}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('AreasSearch');
                }}
              >
                <Ionicons name="search-outline" size={26} color="#262626" />
                <Text style={styles.menuItemText}>Buscar Áreas</Text>
                <Ionicons name="chevron-forward" size={20} color="#c7c7cc" style={styles.menuChevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('Main', { screen: 'Settings' });
                }}
              >
                <Ionicons name="person-outline" size={26} color="#262626" />
                <Text style={styles.menuItemText}>Mi Perfil</Text>
                <Ionicons name="chevron-forward" size={20} color="#c7c7cc" style={styles.menuChevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('NotificationsList');
                }}
              >
                <Ionicons name="notifications-outline" size={26} color="#262626" />
                <Text style={styles.menuItemText}>Notificaciones</Text>
                <Ionicons name="chevron-forward" size={20} color="#c7c7cc" style={styles.menuChevron} />
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.menuCancelButton}
                onPress={() => setShowMenu(false)}
              >
                <Text style={styles.menuCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  callout: {
    padding: 8,
    minWidth: 200,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  urgentTitle: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  eventMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  menuBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#d1d1d6',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  menuItems: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuChevron: {
    marginLeft: 'auto',
  },
  menuBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  menuCancelButton: {
    marginTop: 8,
    marginHorizontal: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d1d6',
  },
  menuCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
