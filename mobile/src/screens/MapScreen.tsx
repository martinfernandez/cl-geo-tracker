import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Platform, Animated } from 'react-native';
import MapView, { Marker, Callout, Circle, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMapState } from '../hooks/useMapState';
import SlidingEventFeed from '../components/SlidingEventFeed';
import EventFilterModal from '../components/EventFilterModal';
import { PulsingMarker } from '../components/PulsingMarker';
import GroupModeChip from '../components/GroupModeChip';
import GroupMembersModal from '../components/GroupMembersModal';
import DevicesModal from '../components/DevicesModal';
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
  const [showDevicesModal, setShowDevicesModal] = useState(false);

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

  // Handler for selecting a device from the modal
  const handleSelectDevice = (device: any) => {
    setShowDevicesModal(false);
    if (device.positions && device.positions.length > 0) {
      const position = device.positions[0];
      // Small delay to ensure modal is closed before animating
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      }, 100);
    }
  };

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
            <Callout tooltip={false}>
              <View style={styles.compactCallout}>
                <View style={[styles.compactCalloutAvatar, { backgroundColor: '#007AFF' }]}>
                  <Text style={styles.compactCalloutAvatarText}>
                    {userProfile?.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.compactCalloutName} numberOfLines={1}>
                  {userProfile?.name || 'Tu ubicación'}
                </Text>
              </View>
            </Callout>
          </Marker>
        )}

        {/* Device Markers - Always visible for device owner */}
        {devicesWithPosition.map((device: any) => {
          const position = device.positions[0];
          if (!position || !position.latitude || !position.longitude) return null;

          const deviceColor = device.color || '#007AFF';
          const deviceInitial = (device.name || device.imei || '?').charAt(0).toUpperCase();

          return (
            <Marker
              key={`device-${device.id}`}
              identifier={`device-${device.id}`}
              coordinate={{
                latitude: position.latitude,
                longitude: position.longitude,
              }}
              rotation={position.heading || 0}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={10}
              tracksViewChanges={false}
              onCalloutPress={() => navigation.navigate('DeviceDetail', { deviceId: device.id })}
            >
              <View style={styles.deviceMarkerWrapper} collapsable={false}>
                <View style={[styles.deviceMarker, { backgroundColor: deviceColor }]}>
                  <View style={styles.deviceMarkerInner}>
                    <Text style={[styles.deviceMarkerText, { color: deviceColor }]}>
                      {deviceInitial}
                    </Text>
                  </View>
                </View>
              </View>
              <Callout tooltip={false}>
                <TouchableOpacity
                  style={styles.compactCallout}
                  activeOpacity={0.7}
                >
                  <View style={[styles.compactCalloutAvatar, { backgroundColor: deviceColor }]}>
                    <Text style={styles.compactCalloutAvatarText}>{deviceInitial}</Text>
                  </View>
                  <Text style={styles.compactCalloutName} numberOfLines={1}>
                    {device.name || device.imei}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>
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
              <Callout tooltip={false}>
                <View style={styles.compactCallout}>
                  <View style={[styles.compactCalloutAvatar, { backgroundColor: markerColor }]}>
                    <Text style={styles.compactCalloutAvatarText}>{initial}</Text>
                  </View>
                  <Text style={styles.compactCalloutName} numberOfLines={1}>
                    {pos.memberName}
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
                  style={styles.eventCallout}
                  activeOpacity={0.7}
                >
                  {/* Row 1: Badges (Status + Urgent + Type) */}
                  <View style={styles.eventBadgesRow}>
                    <View style={[
                      styles.eventStatusBadge,
                      event.status === 'IN_PROGRESS'
                        ? styles.eventStatusActive
                        : styles.eventStatusClosed
                    ]}>
                      <View style={[
                        styles.eventStatusDot,
                        event.status === 'IN_PROGRESS'
                          ? styles.eventStatusDotActive
                          : styles.eventStatusDotClosed
                      ]} />
                      <Text style={[
                        styles.eventStatusText,
                        event.status === 'IN_PROGRESS'
                          ? styles.eventStatusTextActive
                          : styles.eventStatusTextClosed
                      ]}>
                        {event.status === 'IN_PROGRESS' ? 'Activo' : 'Cerrado'}
                      </Text>
                    </View>
                    {event.isUrgent && (
                      <View style={styles.eventUrgentBadge}>
                        <UrgentPulsingDot size="small" />
                      </View>
                    )}
                    <View style={styles.eventTypeBadge}>
                      <Ionicons
                        name={event.realTimeTracking ? 'navigate' : 'flag'}
                        size={10}
                        color={staticColors.primary.main}
                      />
                      <Text style={styles.eventTypeText}>{event.type}</Text>
                    </View>
                  </View>

                  {/* Row 2: Title/Description */}
                  <Text style={styles.eventCalloutTitle} numberOfLines={2}>
                    {event.description}
                  </Text>

                  {/* Row 3: Time + Creator (compact) */}
                  <View style={styles.eventMetaRow}>
                    <Ionicons name="time-outline" size={11} color={staticColors.neutral[500]} />
                    <Text style={styles.eventMetaText}>
                      {new Date(event.createdAt).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    {activeGroup && event.creatorName && (
                      <>
                        <Text style={styles.eventMetaSeparator}>·</Text>
                        <Text style={styles.eventMetaText}>{event.creatorName}</Text>
                      </>
                    )}
                  </View>
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
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No hay dispositivos con posición disponible
          </Text>
        </View>
      )}

      {/* Devices Button - Always show if user has devices */}
      {devicesWithPosition.length > 0 && (
        <TouchableOpacity
          style={[
            styles.devicesButton,
            {
              backgroundColor: theme.bg,
              bottom: (isPeekMode || activeGroup) ? 100 : 20,
            },
          ]}
          onPress={() => setShowDevicesModal(true)}
        >
          <Ionicons name="hardware-chip" size={20} color={theme.primary.main} />
          <View style={[styles.devicesBadge, { backgroundColor: theme.primary.main }]}>
            <Text style={styles.devicesBadgeText}>{devicesWithPosition.length}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Route Toggle Button */}
      {!activeGroup && Object.keys(trackedEventPositions).some((eventId) =>
        trackedEventPositions[eventId] && trackedEventPositions[eventId].length >= 2
      ) && (
        <TouchableOpacity
          style={[
            styles.routeToggleButton,
            {
              backgroundColor: theme.bg,
              bottom: (isPeekMode || activeGroup) ? 100 : 20,
            },
            !showRoutes && { backgroundColor: theme.bgSecondary },
          ]}
          onPress={() => setShowRoutes((prev: boolean) => !prev)}
        >
          <Ionicons
            name={showRoutes ? 'analytics' : 'analytics-outline'}
            size={22}
            color={showRoutes ? theme.primary.main : theme.textTertiary}
          />
        </TouchableOpacity>
      )}

      {/* Center on User Location Button */}
      {userLocation && (
        <TouchableOpacity
          style={[
            styles.centerLocationButton,
            {
              backgroundColor: theme.bg,
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
      <View style={[styles.headerBar, { paddingTop: insets.top + 4, backgroundColor: theme.bg }]}>
        {/* Left side: Logo */}
        <PeekLogo
          size="small"
          showBubble={false}
          isPeeking={isPeekMode}
          onPress={handlePeekModeToggle}
        />

        {/* Right side: Animated Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
        >
          <AnimatedMenuIcon isOpen={showMenu} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Group Mode Chip - positioned inside the map area */}
      {activeGroup && (
        <View style={[styles.groupChipContainer, { top: insets.top + 60 }]}>
          <GroupModeChip
            group={activeGroup}
            onClose={clearActiveGroup}
            onPress={() => setShowGroupMembersModal(true)}
            memberCount={new Set(groupPositions.map((p: any) => p.memberId)).size}
          />
        </View>
      )}

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

      {/* Devices Modal */}
      <DevicesModal
        visible={showDevicesModal}
        onClose={() => setShowDevicesModal(false)}
        devices={devicesWithPosition}
        onSelectDevice={handleSelectDevice}
      />

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
          <View style={[styles.menuBottomSheet, { backgroundColor: theme.bg }]}>
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
                  <Text style={[styles.profileName, { color: theme.text }]}>{userProfile.name}</Text>
                  <Text style={[styles.profileEmail, { color: theme.textTertiary }]}>{userProfile.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textDisabled} />
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
                <Ionicons name="location-outline" size={26} color={theme.text} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Mis Areas de Interes</Text>
                <View style={styles.menuItemRight}>
                  {totalPendingRequests > 0 && (
                    <View style={[styles.menuBadge, { backgroundColor: theme.error.main }]}>
                      <Text style={styles.menuBadgeText}>{totalPendingRequests}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={theme.textDisabled} />
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
                <Ionicons name="search-outline" size={26} color={theme.text} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Buscar Areas</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textDisabled} style={styles.menuChevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('NotificationsList');
                }}
              >
                <Ionicons name="notifications-outline" size={26} color={theme.text} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Notificaciones</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textDisabled} style={styles.menuChevron} />
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: theme.glass.border }]} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  navigation.navigate('Devices', { screen: 'DevicesList' });
                }}
              >
                <Ionicons name="hardware-chip-outline" size={26} color={theme.text} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Mis Dispositivos</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textDisabled} style={styles.menuChevron} />
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
                <Ionicons name="chevron-forward" size={20} color={theme.textDisabled} style={styles.menuChevron} />
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
    minWidth: 200,
    maxWidth: 260,
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
  // Compact callout styles - pill-shaped for devices/users
  compactCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    backgroundColor: '#fff',
    borderRadius: 22,
    gap: 8,
    minWidth: 100,
    maxWidth: 250,
  },
  compactCalloutAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  compactCalloutAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  compactCalloutName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  // Event Callout Styles - Uber-style Compact Card
  eventCallout: {
    padding: 8,
    minWidth: 180,
    maxWidth: 240,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  eventBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 5,
  },
  eventStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  eventStatusActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  eventStatusClosed: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  eventStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  eventStatusDotActive: {
    backgroundColor: '#34C759',
  },
  eventStatusDotClosed: {
    backgroundColor: '#8E8E93',
  },
  eventStatusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  eventStatusTextActive: {
    color: '#34C759',
  },
  eventStatusTextClosed: {
    color: '#8E8E93',
  },
  eventUrgentBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventTypeText: {
    fontSize: 9,
    fontWeight: '600',
    color: staticColors.primary.main,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  eventCalloutTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 17,
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 10,
    color: staticColors.neutral[600],
  },
  eventMetaSeparator: {
    fontSize: 10,
    color: staticColors.neutral[400],
    marginHorizontal: 2,
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
  groupChipContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
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
  devicesButton: {
    position: 'absolute',
    right: 124,
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
  devicesBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  devicesBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
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
  deviceMarkerWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    overflow: 'visible',
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
