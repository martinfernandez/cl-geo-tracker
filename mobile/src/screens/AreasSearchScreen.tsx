import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { areaApi, AreaOfInterest, api } from '../services/api';
import Toast, { ToastType } from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;

interface NearbyArea extends AreaOfInterest {
  distance: number;
}

export default function AreasSearchScreen({ navigation, route }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [areas, setAreas] = useState<AreaOfInterest[]>([]);
  const [nearbyAreas, setNearbyAreas] = useState<NearbyArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [searched, setSearched] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [joiningAreaId, setJoiningAreaId] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'info' });

  const showToast = (message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    loadNearbyAreas();
  }, []);

  const loadNearbyAreas = async () => {
    try {
      setLoadingNearby(true);

      let latitude: number | null = null;
      let longitude: number | null = null;

      // Priority 1: Use map location if passed from MapScreen
      const mapLocation = route.params?.mapLocation;
      if (mapLocation?.latitude && mapLocation?.longitude) {
        latitude = mapLocation.latitude;
        longitude = mapLocation.longitude;
        console.log('[AreasSearch] Using map location:', { latitude, longitude });
      }

      // Priority 2: Try device location if no map location
      if (latitude === null || longitude === null) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          console.log('[AreasSearch] Location permission status:', status);

          if (status === 'granted') {
            console.log('[AreasSearch] Getting current position...');
            let location;
            try {
              location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
            } catch (locError) {
              console.log('[AreasSearch] getCurrentPositionAsync failed, trying getLastKnownPositionAsync...');
              location = await Location.getLastKnownPositionAsync();
            }

            if (location) {
              const deviceLat = location.coords.latitude;
              const deviceLng = location.coords.longitude;
              console.log('[AreasSearch] Got device location:', { latitude: deviceLat, longitude: deviceLng });

              // Check if location is within Argentina bounds (roughly -22 to -55 lat, -73 to -53 lng)
              // If outside, it's likely a simulator default location (like San Francisco)
              const isInArgentina = deviceLat >= -55 && deviceLat <= -22 &&
                                     deviceLng >= -73 && deviceLng <= -53;

              if (isInArgentina) {
                latitude = deviceLat;
                longitude = deviceLng;
              } else {
                console.log('[AreasSearch] Device location outside Argentina, will use profile fallback');
              }
            }
          }
        } catch (locError) {
          console.log('[AreasSearch] Error getting device location:', locError);
        }
      }

      // Priority 3: Fallback to user's profile area of interest
      if (latitude === null || longitude === null) {
        console.log('[AreasSearch] Trying user profile fallback...');
        try {
          const response = await api.get('/users/profile');
          const user = response.data;
          if (user.areaOfInterestLatitude && user.areaOfInterestLongitude) {
            latitude = user.areaOfInterestLatitude;
            longitude = user.areaOfInterestLongitude;
            console.log('[AreasSearch] Using profile location:', { latitude, longitude });
          }
        } catch (profileError) {
          console.log('[AreasSearch] Error getting profile location:', profileError);
        }
      }

      // If still no location, give up
      if (latitude === null || longitude === null) {
        console.log('[AreasSearch] Could not get any location');
        setLoadingNearby(false);
        return;
      }

      setUserLocation({ latitude, longitude });

      // Fetch nearby areas with a larger radius to ensure we get results
      console.log('[AreasSearch] Fetching nearby areas...');
      const data = await areaApi.getNearby({
        latitude,
        longitude,
        radiusKm: 100, // Increased to 100km to catch more areas
      });

      console.log('[AreasSearch] Received', data.length, 'nearby areas:', data.map((a: NearbyArea) => a.name));
      setNearbyAreas(data);
    } catch (error: any) {
      console.error('[AreasSearch] Error loading nearby areas:', error?.message || error);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setSearched(true);
      const data = await areaApi.search({ query: searchQuery });
      setAreas(data);
    } catch (error) {
      console.error('Error searching areas:', error);
      showToast('No se pudieron buscar las areas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (area: AreaOfInterest | NearbyArea, isNearby: boolean = false) => {
    setJoiningAreaId(area.id);
    try {
      if (area.visibility === 'PUBLIC') {
        await areaApi.join(area.id);
        showToast(`Te has unido a "${area.name}"`, 'success');
        if (isNearby) {
          loadNearbyAreas();
        } else {
          handleSearch();
        }
      } else if (area.visibility === 'PRIVATE_SHAREABLE') {
        await areaApi.requestJoin(area.id);
        showToast(`Solicitud enviada a "${area.name}". El administrador revisara tu solicitud.`, 'info');
        if (isNearby) {
          loadNearbyAreas();
        } else {
          handleSearch();
        }
      }
    } catch (error) {
      console.error('Error joining area:', error);
      showToast('No se pudo completar la accion', 'error');
    } finally {
      setJoiningAreaId(null);
    }
  };

  const getVisibilityInfo = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return { label: 'Publica', color: '#34C759', icon: 'globe-outline' as const };
      case 'PRIVATE_SHAREABLE':
        return { label: 'Privada', color: '#FF9500', icon: 'lock-closed-outline' as const };
      default:
        return { label: 'Privada', color: '#8E8E93', icon: 'lock-closed-outline' as const };
    }
  };

  const renderSuggestionCard = ({ item, index }: { item: NearbyArea; index: number }) => {
    const isJoining = joiningAreaId === item.id;
    const visibilityInfo = getVisibilityInfo(item.visibility);

    // Gradient colors based on index for variety
    const gradients = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#a18cd1', '#fbc2eb'],
    ];
    const gradient = gradients[index % gradients.length];

    return (
      <TouchableOpacity
        style={styles.suggestionCard}
        onPress={() => navigation.navigate('AreaDetail', { areaId: item.id })}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.suggestionGradient}
        >
          {/* Header with visibility */}
          <View style={styles.suggestionHeader}>
            <View style={styles.visibilityPill}>
              <Ionicons name={visibilityInfo.icon} size={12} color="#fff" />
              <Text style={styles.visibilityPillText}>{visibilityInfo.label}</Text>
            </View>
            <View style={styles.distancePill}>
              <Ionicons name="location" size={12} color="#fff" />
              <Text style={styles.distancePillText}>{item.distance} km</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.suggestionContent}>
            <Text style={styles.suggestionName} numberOfLines={2}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.suggestionDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>

          {/* Footer */}
          <View style={styles.suggestionFooter}>
            <View style={styles.memberInfo}>
              <Ionicons name="people" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.memberCount}>{item.memberCount} miembros</Text>
            </View>

            {item.isMember ? (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.statusBadgeText}>Miembro</Text>
              </View>
            ) : item.hasPendingRequest ? (
              <View style={[styles.statusBadge, styles.pendingBadge]}>
                <Ionicons name="time" size={16} color="#fff" />
                <Text style={styles.statusBadgeText}>Pendiente</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleJoin(item, true);
                }}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#333" />
                ) : (
                  <>
                    <Text style={styles.joinButtonText}>
                      {item.visibility === 'PRIVATE_SHAREABLE' ? 'Solicitar' : 'Unirse'}
                    </Text>
                    <Ionicons
                      name={item.visibility === 'PRIVATE_SHAREABLE' ? 'arrow-forward' : 'add'}
                      size={16}
                      color="#333"
                    />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderAreaItem = ({ item }: { item: AreaOfInterest }) => {
    const visibilityInfo = getVisibilityInfo(item.visibility);
    const isJoining = joiningAreaId === item.id;

    return (
      <TouchableOpacity
        style={styles.areaCard}
        onPress={() => navigation.navigate('AreaDetail', { areaId: item.id })}
      >
        <View style={styles.areaCardContent}>
          <View style={styles.areaCardHeader}>
            <Text style={styles.areaCardName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.areaVisibilityBadge, { backgroundColor: visibilityInfo.color }]}>
              <Ionicons name={visibilityInfo.icon} size={10} color="#fff" />
              <Text style={styles.areaVisibilityText}>{visibilityInfo.label}</Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.areaCardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.areaCardFooter}>
            <View style={styles.areaStats}>
              <View style={styles.areaStat}>
                <Ionicons name="people-outline" size={14} color="#8E8E93" />
                <Text style={styles.areaStatText}>{item.memberCount}</Text>
              </View>
              <View style={styles.areaStat}>
                <Ionicons name="radio-outline" size={14} color="#8E8E93" />
                <Text style={styles.areaStatText}>{(item.radius / 1000).toFixed(1)} km</Text>
              </View>
            </View>

            {item.isMember ? (
              <View style={styles.areaStatusChip}>
                <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                <Text style={[styles.areaStatusText, { color: '#34C759' }]}>Miembro</Text>
              </View>
            ) : item.hasPendingRequest ? (
              <View style={styles.areaStatusChip}>
                <Ionicons name="time" size={14} color="#FF9500" />
                <Text style={[styles.areaStatusText, { color: '#FF9500' }]}>Pendiente</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.areaJoinButton,
                  { backgroundColor: item.visibility === 'PRIVATE_SHAREABLE' ? '#FF9500' : '#34C759' }
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleJoin(item);
                }}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.areaJoinButtonText}>
                    {item.visibility === 'PRIVATE_SHAREABLE' ? 'Solicitar' : 'Unirse'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderNearbySuggestions = () => {
    if (loadingNearby) {
      return (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingSectionText}>Buscando areas cercanas...</Text>
        </View>
      );
    }

    if (!userLocation) {
      return (
        <View style={styles.emptySection}>
          <View style={styles.emptySectionIcon}>
            <Ionicons name="location-outline" size={32} color="#8E8E93" />
          </View>
          <Text style={styles.emptySectionTitle}>Ubicacion no disponible</Text>
          <Text style={styles.emptySectionText}>
            Activa la ubicacion para ver areas cercanas
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNearbyAreas}>
            <Ionicons name="refresh" size={18} color="#007AFF" />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const suggestedAreas = nearbyAreas.filter((a) => !a.isMember);

    if (nearbyAreas.length === 0) {
      return (
        <View style={styles.emptySection}>
          <View style={styles.emptySectionIcon}>
            <Ionicons name="compass-outline" size={32} color="#8E8E93" />
          </View>
          <Text style={styles.emptySectionTitle}>Sin areas cercanas</Text>
          <Text style={styles.emptySectionText}>
            No encontramos areas de interes cerca de tu ubicacion
          </Text>
        </View>
      );
    }

    if (suggestedAreas.length === 0) {
      return (
        <View style={styles.emptySection}>
          <View style={[styles.emptySectionIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#34C759" />
          </View>
          <Text style={styles.emptySectionTitle}>Ya eres miembro</Text>
          <Text style={styles.emptySectionText}>
            Ya perteneces a todas las areas cercanas disponibles
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.suggestionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sugerencias para ti</Text>
          <Text style={styles.sectionSubtitle}>Basado en tu ubicacion actual</Text>
        </View>
        <FlatList
          horizontal
          data={suggestedAreas.slice(0, 10)}
          renderItem={renderSuggestionCard}
          keyExtractor={(item) => `nearby-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsList}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Toast
        title={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast({ ...toast, visible: false })}
        duration={4000}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explorar</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar areas..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearched(false);
              setAreas([]);
            }}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : searched ? (
        areas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>
              No encontramos areas con ese nombre
            </Text>
          </View>
        ) : (
          <FlatList
            data={areas}
            renderItem={renderAreaItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        )
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderNearbySuggestions()}

          <View style={styles.discoverSection}>
            <View style={styles.discoverCard}>
              <Ionicons name="compass" size={40} color="#007AFF" />
              <Text style={styles.discoverTitle}>Descubre comunidades</Text>
              <Text style={styles.discoverText}>
                Busca por nombre o explora las sugerencias basadas en tu ubicacion
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DBDBDB',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
    padding: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  suggestionsSection: {
    paddingTop: 20,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  suggestionsList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  suggestionCard: {
    width: CARD_WIDTH,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionGradient: {
    padding: 20,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  visibilityPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  distancePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  suggestionContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  suggestionName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  suggestionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCount: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,149,0,0.3)',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingSectionText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptySectionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  discoverSection: {
    padding: 16,
    paddingTop: 24,
  },
  discoverCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  discoverTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  discoverText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  listContainer: {
    padding: 16,
  },
  areaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  areaCardContent: {
    padding: 16,
  },
  areaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaCardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginRight: 12,
  },
  areaVisibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  areaVisibilityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  areaCardDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  areaCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaStats: {
    flexDirection: 'row',
    gap: 16,
  },
  areaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  areaStatText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  areaStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  areaStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  areaJoinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  areaJoinButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
