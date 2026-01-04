import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Platform, Animated } from 'react-native';
import MapView, { Marker, Callout, Circle, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMapState } from '../hooks/useMapState';
import SlidingEventFeed from '../components/SlidingEventFeed';
import EventFilterModal from '../components/EventFilterModal';
import { PulsingMarker } from '../components/PulsingMarker';
import GroupModeChip from '../components/GroupModeChip';
import GroupMembersModal from '../components/GroupMembersModal';
import { PeekLogo } from '../components/PeekLogo';
import { PeekModeBanner } from '../components/PeekModeBanner';
import { UrgentPulsingDot } from '../components/UrgentPulsingDot';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors as staticColors, radius } from '../theme/colors';

// Animated Hamburger Menu Icon Component
const AnimatedMenuIcon = ({ isOpen, color }: { isOpen: boolean; color: string }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const topLineY = useRef(new Animated.Value(0)).current;
  const bottomLineY = useRef(new Animated.Value(0)).current;
  const middleOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rotation, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(topLineY, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(bottomLineY, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(middleOpacity, {
        toValue: isOpen ? 0 : 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  const topRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const bottomRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-45deg'],
  });

  const topTranslateY = topLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  const bottomTranslateY = bottomLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <View style={menuIconStyles.container}>
      <Animated.View
        style={[
          menuIconStyles.line,
          { backgroundColor: color },
          {
            transform: [
              { translateY: topTranslateY },
              { rotate: topRotate },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          menuIconStyles.line,
          { backgroundColor: color, opacity: middleOpacity },
        ]}
      />
      <Animated.View
        style={[
          menuIconStyles.line,
          { backgroundColor: color },
          {
            transform: [
              { translateY: bottomTranslateY },
              { rotate: bottomRotate },
            ],
          },
        ]}
      />
    </View>
  );
};

const menuIconStyles = StyleSheet.create({
  container: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  line: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
});

export function MapScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  // Use the centralized map state hook
  const {
    mapRef,
    userLocation,
    mapRegion,
    trackedEventPositions,
    displayEvents,
    activeGroup,
    clearActiveGroup,
    groupPositions,
    selectedMember,
    showGroupMembersModal,
    setShowGroupMembersModal,
    refreshing,
    showFilterModal,
    setShowFilterModal,
    showMenu,
    setShowMenu,
    feedMinimized,
    showRoutes,
    setShowRoutes,
    filters,
    areaOfInterest,
    selectedArea,
    userProfile,
    totalPendingRequests,
    devicesWithPosition,
    isPeekMode,
    handlePeekModeToggle,
    handleRegionChangeComplete,
    handleRefresh,
    handleFilterApply,
    handleSelectMember,
    handleMapReady,
    centerOnUserLocation,
    loadGroupData,
  } = useMapState({ navigation, route });

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
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {/* Area of Interest Circle - Only show when NOT in group mode */}
        {!activeGroup && areaOfInterest && (
          <Circle
            center={{
              latitude: areaOfInterest.latitude,
              longitude: areaOfInterest.longitude,
            }}
            radius={areaOfInterest.radius}
            fillColor={theme.map.areaFill}
            strokeColor={theme.map.areaStroke}
            strokeWidth={2}
          />
        )}

        {/* Selected Area Circle (from "Ver" button) - Only show when NOT in group mode */}
        {!activeGroup && selectedArea && (
          <>
            <Circle
              center={{
                latitude: selectedArea.latitude,
                longitude: selectedArea.longitude,
              }}
              radius={selectedArea.radius}
              fillColor={theme.error.subtle}
              strokeColor={theme.error.main}
              strokeWidth={2}
            />
            <Marker
              coordinate={{
                latitude: selectedArea.latitude,
                longitude: selectedArea.longitude,
              }}
              pinColor={theme.error.main}
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

        {/* User Location Marker - Shows user's initial, smaller so it doesn't obstruct other markers */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={0}
          >
            <View style={styles.userLocationMarker}>
              <Text style={styles.userLocationMarkerText}>
                {userProfile?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>Tu ubicación</Text>
                <Text style={styles.calloutText}>
                  {userProfile?.name || 'Usuario'}
                </Text>
              </View>
            </Callout>
          </Marker>
        )}

        {/* Device Markers - Only show when NOT in group mode */}
        {!activeGroup && devicesWithPosition.map((device: any) => {
          const position = device.positions[0];
          const deviceColor = device.color || '#007AFF';
          const deviceInitial = (device.name || device.imei || '?').charAt(0).toUpperCase();

          return (
            <Marker
              key={device.id}
              coordinate={{
                latitude: position.latitude,
                longitude: position.longitude,
              }}
              rotation={position.heading || 0}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={1}
            >
              <View style={[styles.deviceMarker, { backgroundColor: deviceColor }]}>
                <View style={styles.deviceMarkerInner}>
                  <Text style={[styles.deviceMarkerText, { color: deviceColor }]}>
                    {deviceInitial}
                  </Text>
                </View>
              </View>
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
                    {new Date(position.createdAt || position.timestamp).toLocaleString('es')}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Group Member Positions - Only show when in group mode */}
        {activeGroup && groupPositions.map((pos: any, index: number) => {
          const isPhone = pos.type === 'PHONE';
          const isSelected = selectedMember?.memberId === pos.memberId && selectedMember?.deviceId === pos.deviceId;
          const markerColor = isSelected ? '#FF3B30' : (isPhone ? '#34C759' : '#007AFF');
          const initial = pos.memberName?.charAt(0)?.toUpperCase() || '?';
          const markerKey = `group-pos-${pos.memberId}-${pos.type}-${pos.deviceId || 'phone'}`;

          return (
            <Marker
              key={markerKey}
              coordinate={{
                latitude: pos.latitude,
                longitude: pos.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={isSelected ? 999 : 1}
            >
              <View style={[
                styles.groupMarker,
                { backgroundColor: markerColor },
                isSelected && styles.selectedGroupMarker
              ]}>
                <View style={[
                  styles.groupMarkerInner,
                  isSelected && styles.selectedGroupMarkerInner
                ]}>
                  <Text style={[
                    styles.groupMarkerText,
                    isSelected && styles.selectedGroupMarkerText
                  ]}>{initial}</Text>
                </View>
              </View>
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    {pos.memberName}
                  </Text>
                  <Text style={styles.calloutText}>
                    {isPhone ? 'Telefono' : pos.deviceName || 'Dispositivo JX10'}
                  </Text>
                  {pos.speed !== null && pos.speed !== undefined && (
                    <Text style={styles.calloutText}>
                      Velocidad: {pos.speed.toFixed(1)} km/h
                    </Text>
                  )}
                  <Text style={styles.calloutText}>
                    {new Date(pos.timestamp).toLocaleString('es')}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Selected Member Highlight Circle */}
        {selectedMember && (
          <Circle
            center={{
              latitude: selectedMember.latitude,
              longitude: selectedMember.longitude,
            }}
            radius={50}
            fillColor={theme.error.subtle}
            strokeColor={theme.error.main}
            strokeWidth={2}
          />
        )}

        {/* Event Markers */}
        {displayEvents.map((event: any) => {
          const isActiveUrgent = event.isUrgent && event.status === 'IN_PROGRESS';

          return (
            <Marker
              key={`event-${event.id}`}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onCalloutPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
            >
              {isActiveUrgent ? (
                <PulsingMarker size={16} color={theme.map.eventUrgent} />
              ) : (
                <View
                  style={[
                    styles.eventMarker,
                    { backgroundColor: event.isUrgent ? theme.map.eventUrgent : theme.map.eventNormal },
                  ]}
                />
              )}
              <Callout tooltip={false}>
                <TouchableOpacity
                  style={styles.callout}
                  activeOpacity={0.7}
                >
                  <View style={styles.calloutTitleRow}>
                    {event.isUrgent && <UrgentPulsingDot size="small" />}
                    <Text style={[styles.calloutTitle, event.isUrgent && styles.urgentTitle]}>
                      {event.realTimeTracking && '📍 '}
                      {event.type}
                    </Text>
                  </View>
                  <Text style={styles.calloutText} numberOfLines={2}>
                    {event.description}
                  </Text>
                  <Text style={styles.calloutText}>
                    Estado: {event.status === 'IN_PROGRESS' ? 'En Progreso' : 'Cerrado'}
                  </Text>
                  {activeGroup && event.creatorName && (
                    <Text style={styles.calloutText}>
                      Creado por: {event.creatorName}
                    </Text>
                  )}
                  <Text style={[styles.calloutText, styles.calloutHint]}>
                    Toca para ver detalles
                  </Text>
                </TouchableOpacity>
              </Callout>
            </Marker>
          );
        })}

        {/* Polylines for tracked events - ONLY render when NOT in group mode AND routes are visible */}
        {!activeGroup && showRoutes && Object.keys(trackedEventPositions).map((eventId) => {
          const positions = trackedEventPositions[eventId];

          if (!positions || positions.length < 2) {
            return null;
          }

          return (
            <Polyline
              key={`route-${eventId}`}
              coordinates={positions}
              strokeColor={theme.primary.main}
              strokeWidth={4}
              geodesic={true}
              lineCap="round"
              lineJoin="round"
            />
          );
        })}
      </MapView>

      {devicesWithPosition.length === 0 && !userLocation && (
        <View style={[styles.emptyOverlay, { backgroundColor: theme.glass.bg, borderColor: theme.glass.border }]}>
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
            No hay dispositivos con posición disponible
          </Text>
        </View>
      )}

      {/* Route Toggle Button */}
      {!activeGroup && Object.keys(trackedEventPositions).some((eventId) =>
        trackedEventPositions[eventId] && trackedEventPositions[eventId].length >= 2
      ) && (
        <TouchableOpacity
          style={[
            styles.routeToggleButton,
            {
              backgroundColor: theme.bg.primary,
              bottom: (isPeekMode || activeGroup) ? 100 : 20,
            },
            !showRoutes && { backgroundColor: theme.bg.secondary },
          ]}
          onPress={() => setShowRoutes((prev: boolean) => !prev)}
        >
          <Ionicons
            name={showRoutes ? 'analytics' : 'analytics-outline'}
            size={22}
            color={showRoutes ? theme.primary.main : theme.text.tertiary}
          />
        </TouchableOpacity>
      )}

      {/* Center on User Location Button */}
      {userLocation && (
        <TouchableOpacity
          style={[
            styles.centerLocationButton,
            {
              backgroundColor: theme.bg.primary,
              bottom: (isPeekMode || activeGroup) ? 100 : 20,
            }
          ]}
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={22} color={theme.primary.main} />
        </TouchableOpacity>
      )}

      {/* Peek Mode Banner */}
      {!activeGroup && (
        <View style={[styles.peekBannerContainer, { bottom: isPeekMode ? 98 : 30 }]}>
          <PeekModeBanner
            isPeeking={isPeekMode}
            onPress={handlePeekModeToggle}
          />
        </View>
      )}

      {/* Only show feed when in peek mode or group mode */}
      {(isPeekMode || activeGroup) && (
        <SlidingEventFeed
          events={displayEvents}
          onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
          onRefresh={activeGroup ? loadGroupData : handleRefresh}
          refreshing={refreshing}
          onFilterPress={() => setShowFilterModal(true)}
          onCommentPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
          isGroupMode={!!activeGroup}
          groupName={activeGroup?.name}
          startMinimized={feedMinimized}
        />
      )}

      <EventFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        initialFilters={filters}
      />

      {/* Header Bar - Instagram-style compact */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 4, backgroundColor: theme.bg.primary }]}>
        {/* Left side: Logo or Group Chip */}
        {!activeGroup ? (
          <PeekLogo
            size="small"
            showBubble={false}
            isPeeking={isPeekMode}
            onPress={handlePeekModeToggle}
          />
        ) : (
          <GroupModeChip
            group={activeGroup}
            onClose={clearActiveGroup}
            onPress={() => setShowGroupMembersModal(true)}
            memberCount={new Set(groupPositions.map((p: any) => p.memberId)).size}
          />
        )}

        {/* Right side: Animated Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
        >
          <AnimatedMenuIcon isOpen={showMenu} color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Group Members Modal */}
      {activeGroup && (
        <GroupMembersModal
          visible={showGroupMembersModal}
          onClose={() => setShowGroupMembersModal(false)}
          positions={groupPositions}
          onSelectMember={handleSelectMember}
          groupName={activeGroup.name}
        />
      )}

      {/* Menu Modal - Instagram Style Bottom Sheet */}
      <Modal
        visible={showMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={[styles.menuOverlay, { backgroundColor: theme.overlay.medium }]}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuBottomSheet, { backgroundColor: theme.bg.primary }]}>
            {/* Handle Bar */}
            <View style={[styles.sheetHandle, { backgroundColor: theme.glass.borderStrong }]} />

            {/* User Profile Header - Instagram Style */}
            {userProfile && (
              <TouchableOpacity
                style={styles.profileHeader}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('Settings');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.profileAvatar, { backgroundColor: theme.primary.main }]}>
                  <Text style={styles.profileAvatarText}>
                    {userProfile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: theme.text.primary }]}>{userProfile.name}</Text>
                  <Text style={[styles.profileEmail, { color: theme.text.tertiary }]}>{userProfile.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} />
              </TouchableOpacity>
            )}

            <View style={[styles.menuDivider, { backgroundColor: theme.glass.border }]} />

            <View style={styles.menuItems}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('AreasList');
                }}
              >
                <Ionicons name="location-outline" size={26} color={theme.text.primary} />
                <Text style={[styles.menuItemText, { color: theme.text.primary }]}>Mis Areas de Interes</Text>
                <View style={styles.menuItemRight}>
                  {totalPendingRequests > 0 && (
                    <View style={[styles.menuBadge, { backgroundColor: theme.error.main }]}>
                      <Text style={styles.menuBadgeText}>{totalPendingRequests}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('AreasSearch', {
                    mapLocation: mapRegion ? {
                      latitude: mapRegion.latitude,
                      longitude: mapRegion.longitude,
                    } : undefined,
                  });
                }}
              >
                <Ionicons name="search-outline" size={26} color={theme.text.primary} />
                <Text style={[styles.menuItemText, { color: theme.text.primary }]}>Buscar Areas</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} style={styles.menuChevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('NotificationsList');
                }}
              >
                <Ionicons name="notifications-outline" size={26} color={theme.text.primary} />
                <Text style={[styles.menuItemText, { color: theme.text.primary }]}>Notificaciones</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} style={styles.menuChevron} />
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: theme.glass.border }]} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('Devices', { screen: 'DevicesList' });
                }}
              >
                <Ionicons name="hardware-chip-outline" size={26} color={theme.text.primary} />
                <Text style={[styles.menuItemText, { color: theme.text.primary }]}>Mis Dispositivos</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} style={styles.menuChevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('Devices', { screen: 'AddDevice' });
                }}
              >
                <Ionicons name="add-circle-outline" size={26} color={theme.primary.main} />
                <Text style={[styles.menuItemText, { color: theme.primary.main }]}>Agregar Dispositivo</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} style={styles.menuChevron} />
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.menuCancelButton, { borderTopColor: theme.glass.border }]}
                onPress={() => setShowMenu(false)}
              >
                <Text style={[styles.menuCancelText, { color: theme.primary.main }]}>Cancelar</Text>
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
    padding: 12,
    minWidth: 220,
    maxWidth: 280,
  },
  calloutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: staticColors.neutral[900],
    letterSpacing: -0.2,
  },
  calloutText: {
    fontSize: 13,
    color: staticColors.neutral[500],
    marginTop: 3,
    lineHeight: 18,
  },
  calloutHint: {
    color: staticColors.primary.main,
    fontWeight: '600',
    marginTop: 6,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 14,
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
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 1000,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeToggleButton: {
    position: 'absolute',
    right: 72,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  routeToggleButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  centerLocationButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 20,
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
  peekBannerContainer: {
    position: 'absolute',
    left: 16,
    bottom: 110,
    zIndex: 10,
  },
  groupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  groupMarkerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupMarkerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  selectedGroupMarker: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#fff',
  },
  selectedGroupMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  selectedGroupMarkerText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  userLocationMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userLocationMarkerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  // Device marker styles
  deviceMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deviceMarkerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceMarkerText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
