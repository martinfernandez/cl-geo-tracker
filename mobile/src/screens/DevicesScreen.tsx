import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Animated,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceApi, Device as ApiDevice } from '../services/api';
import { useDeviceStore } from '../store/useDeviceStore';
import { Device } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { FadeInView } from '../components/FadeInView';

// Battery indicator component
function BatteryIndicator({ level, isLow, isDark }: { level: number | null | undefined; isLow: boolean; isDark: boolean }) {
  if (level === null || level === undefined) {
    return null;
  }

  const getBatteryIcon = () => {
    if (level <= 10) return 'battery-dead';
    if (level <= 25) return 'battery-low' as any;
    if (level <= 50) return 'battery-half';
    if (level <= 75) return 'battery-three-quarters' as any;
    return 'battery-full';
  };

  const getBatteryColor = () => {
    if (level <= 20) return '#FF3B30';
    if (level <= 40) return '#FF9500';
    return '#34C759';
  };

  const getBatteryBgColor = () => {
    if (isLow) return isDark ? 'rgba(255, 59, 48, 0.2)' : '#FFEBEB';
    if (level <= 40) return isDark ? 'rgba(255, 149, 0, 0.15)' : '#FFF8E6';
    return isDark ? 'rgba(52, 199, 89, 0.15)' : '#E8F8ED';
  };

  return (
    <View style={[styles.batteryBadge, { backgroundColor: getBatteryBgColor() }]}>
      <Ionicons name="battery-half" size={14} color={getBatteryColor()} />
      <Text style={[styles.batteryText, { color: getBatteryColor() }]}>{level}%</Text>
    </View>
  );
}

// Component for the pulsing status indicator
// status: 'reporting' (green) | 'connected' (yellow/orange) | 'offline' (red)
function StatusIndicator({ status, size = 'normal' }: { status: 'reporting' | 'connected' | 'offline'; size?: 'normal' | 'small' }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  const baseSize = size === 'small' ? 10 : 14;
  const color = status === 'reporting' ? '#34C759' : status === 'connected' ? '#FF9500' : '#FF3B30';
  const pulseOpacity = status === 'reporting' ? 0.4 : status === 'connected' ? 0.3 : 0.2;

  return (
    <View style={[styles.statusIndicatorContainer, { width: baseSize * 2.5, height: baseSize * 2.5 }]}>
      <Animated.View
        style={[
          styles.statusPulse,
          {
            width: baseSize * 2,
            height: baseSize * 2,
            borderRadius: baseSize,
            backgroundColor: color,
            opacity: opacityAnim.interpolate({
              inputRange: [0, 0.6],
              outputRange: [0, pulseOpacity],
            }),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <View
        style={[
          styles.statusDot,
          {
            width: baseSize,
            height: baseSize,
            borderRadius: baseSize / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// Calculate device connectivity status
// Returns: 'reporting' | 'connected' | 'offline'
// - 'reporting': has recent GPS positions (within 5 min)
// - 'connected': has recent battery/status updates (within 10 min) but no GPS
// - 'offline': no recent activity
function getDeviceStatus(device: any, lastPosition: any): 'reporting' | 'connected' | 'offline' {
  const now = new Date();

  // Check if reporting GPS positions
  if (lastPosition) {
    const positionTime = new Date(lastPosition.createdAt || lastPosition.timestamp);
    const diffMinutes = (now.getTime() - positionTime.getTime()) / (1000 * 60);
    if (diffMinutes <= 5) return 'reporting';
  }

  // Check if device has recent battery updates (connected but not sending GPS)
  if (device?.batteryUpdatedAt) {
    const batteryTime = new Date(device.batteryUpdatedAt);
    const diffMinutes = (now.getTime() - batteryTime.getTime()) / (1000 * 60);
    if (diffMinutes <= 10) return 'connected';
  }

  return 'offline';
}

// Format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return `Hace ${diffDays}d`;
}

export function DevicesScreen({ navigation }: any) {
  const { devices, setDevices } = useDeviceStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDark } = useTheme();

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await deviceApi.getAll();
      setDevices(data);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  // Reload when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDevices();
    });
    return unsubscribe;
  }, [navigation]);

  // Separate GPS devices and tagged objects
  const gpsDevices = devices.filter((d: any) => d.type !== 'TAGGED_OBJECT');
  const taggedObjects = devices.filter((d: any) => d.type === 'TAGGED_OBJECT');

  // Count low battery devices (exclude 0 as it means external power/no battery)
  const lowBatteryDevices = gpsDevices.filter(
    (d: any) => d.batteryLevel !== null && d.batteryLevel !== undefined && d.batteryLevel > 0 && d.batteryLevel <= 20
  );
  const lowBatteryCount = lowBatteryDevices.length;

  const renderGPSDevice = ({ item }: { item: Device }) => {
    const lastPosition = (item as any).positions?.[0];
    const deviceStatus = getDeviceStatus(item, lastPosition);
    // Use createdAt (server time) instead of timestamp (GPS device time)
    const lastUpdateDate = lastPosition
      ? new Date(lastPosition.createdAt || lastPosition.timestamp)
      : null;
    const batteryLevel = (item as any).batteryLevel;
    // Battery = 0 means external power/no battery, so only show low battery warning for 1-20%
    const isLowBattery = batteryLevel !== null && batteryLevel !== undefined && batteryLevel > 0 && batteryLevel <= 20;

    // Get status label and style based on device status
    const getStatusLabel = () => {
      switch (deviceStatus) {
        case 'reporting':
          return 'Reportando GPS';
        case 'connected':
          return 'Conectado';
        case 'offline':
          return 'Sin conexión';
      }
    };

    const getStatusStyle = () => {
      switch (deviceStatus) {
        case 'reporting':
          return styles.statusActive;
        case 'connected':
          return styles.statusConnected;
        case 'offline':
          return styles.statusInactive;
      }
    };

    // Determine border color based on connection status
    const getBorderColor = () => {
      switch (deviceStatus) {
        case 'reporting':
          return '#34C759'; // Green
        case 'connected':
          return '#FF9500'; // Orange
        case 'offline':
          return '#FF3B30'; // Red
      }
    };

    return (
      <TouchableOpacity
        style={[styles.deviceCard, { backgroundColor: theme.surface, borderWidth: 1, borderColor: getBorderColor() }]}
        onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}
      >
        <View style={styles.deviceRow}>
          <StatusIndicator status={deviceStatus} />
          <View style={styles.deviceInfo}>
            <View style={styles.deviceHeader}>
              <Text style={[styles.deviceName, { color: theme.text }]}>{item.name || item.imei}</Text>
              <View style={styles.deviceHeaderRight}>
                <BatteryIndicator level={batteryLevel} isLow={isLowBattery} isDark={isDark} />
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </View>
            </View>
            <Text style={[styles.deviceImei, { color: theme.textSecondary }]}>IMEI: {item.imei}</Text>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, getStatusStyle()]}>
                {getStatusLabel()}
              </Text>
              {lastUpdateDate && (
                <Text style={[styles.lastUpdateText, { color: theme.textSecondary }]}>
                  · {formatTimeAgo(lastUpdateDate)}
                </Text>
              )}
            </View>
            {lastPosition?.speed !== undefined && lastPosition.speed !== null && (
              <Text style={[styles.speedText, { color: theme.textSecondary }]}>
                Velocidad: {lastPosition.speed.toFixed(1)} km/h
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaggedObject = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={[styles.taggedObjectCard, { backgroundColor: theme.surface, borderWidth: 1, borderColor: isDark ? '#3A3A3C' : 'transparent' }]}
        onPress={() => navigation.navigate('DeviceQR', { deviceId: item.id })}
      >
        <View style={styles.taggedObjectRow}>
          <View style={[styles.taggedObjectIcon, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : '#E3F2FD' }]}>
            <Ionicons name="pricetag" size={24} color={theme.primary.main} />
          </View>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceHeader}>
              <Text style={[styles.deviceName, { color: theme.text }]}>{item.name || 'Objeto'}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.qrStatusRow}>
              <View style={[styles.qrBadge, item.qrEnabled ? (isDark ? { backgroundColor: 'rgba(52, 199, 89, 0.2)' } : styles.qrBadgeActive) : (isDark ? { backgroundColor: '#2C2C2E' } : styles.qrBadgeInactive)]}>
                <Ionicons
                  name={item.qrEnabled ? 'qr-code' : 'qr-code-outline'}
                  size={12}
                  color={item.qrEnabled ? '#34C759' : theme.textSecondary}
                />
                <Text style={[styles.qrBadgeText, { color: item.qrEnabled ? '#34C759' : theme.textSecondary }]}>
                  {item.qrEnabled ? 'QR activo' : 'QR inactivo'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Dispositivos</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dispositivos</Text>
        <View style={styles.headerButton} />
      </View>

      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <View style={styles.listContent}>
            {/* Low Battery Warning Banner */}
            {lowBatteryCount > 0 && (
              <View style={[styles.lowBatteryBanner, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : '#FFF5F5' }]}>
                <View style={[styles.lowBatteryBannerIcon, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.2)' : '#FFEBEB' }]}>
                  <Ionicons name="battery-dead" size={24} color="#FF3B30" />
                </View>
                <View style={styles.lowBatteryBannerContent}>
                  <Text style={styles.lowBatteryBannerTitle}>
                    {lowBatteryCount === 1 ? '1 dispositivo con batería baja' : `${lowBatteryCount} dispositivos con batería baja`}
                  </Text>
                  <Text style={[styles.lowBatteryBannerSubtitle, { color: theme.textSecondary }]}>
                    {lowBatteryDevices.map((d: any) => d.name || `JX10-${d.imei?.slice(-4)}`).join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Found Chats Link */}
            <TouchableOpacity
              style={[styles.foundChatsCard, { backgroundColor: theme.surface, borderWidth: 1, borderColor: isDark ? '#3A3A3C' : 'transparent' }]}
              onPress={() => navigation.getParent()?.navigate('FoundChats')}
            >
              <View style={[styles.foundChatsIcon, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.2)' : '#FFF3E0' }]}>
                <Ionicons name="search" size={22} color="#FF9500" />
              </View>
              <View style={styles.foundChatsInfo}>
                <Text style={[styles.foundChatsTitle, { color: theme.text }]}>Objetos Encontrados</Text>
                <Text style={[styles.foundChatsSubtitle, { color: theme.textSecondary }]}>Chats con quienes encontraron tus objetos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* GPS Devices Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="hardware-chip" size={20} color="#34C759" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Dispositivos GPS</Text>
              </View>
              <TouchableOpacity
                style={[styles.addSectionButton, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.25)' : '#E8F8ED' }]}
                onPress={() => navigation.navigate('AddDevice')}
              >
                <Ionicons name="add" size={20} color="#34C759" />
              </TouchableOpacity>
            </View>

            {gpsDevices.length === 0 ? (
              <View style={[styles.emptySectionCard, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                <Ionicons name="hardware-chip-outline" size={32} color={theme.textSecondary} />
                <Text style={[styles.emptySectionText, { color: theme.textSecondary }]}>No hay dispositivos GPS</Text>
                <TouchableOpacity
                  style={styles.addSectionLink}
                  onPress={() => navigation.navigate('AddDevice')}
                >
                  <Text style={[styles.addSectionLinkText, { color: theme.primary.main }]}>Agregar dispositivo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              gpsDevices.map((item: any, index: number) => (
                <FadeInView key={item.id} delay={index * 50} duration={350}>
                  {renderGPSDevice({ item })}
                </FadeInView>
              ))
            )}

            {/* Tags Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="pricetag" size={20} color="#0A84FF" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Tags</Text>
              </View>
              <TouchableOpacity
                style={[styles.addSectionButton, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.25)' : '#E3F2FD' }]}
                onPress={() => navigation.navigate('AddTaggedObject')}
              >
                <Ionicons name="add" size={20} color="#0A84FF" />
              </TouchableOpacity>
            </View>

            {taggedObjects.length === 0 ? (
              <View style={[styles.emptySectionCard, { backgroundColor: theme.surface, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                <Ionicons name="pricetag-outline" size={32} color={theme.textSecondary} />
                <Text style={[styles.emptySectionText, { color: theme.textSecondary }]}>No hay tags</Text>
                <Text style={[styles.emptySectionHint, { color: isDark ? '#6A6A6E' : '#C7C7CC' }]}>Crea codigos QR para tus objetos</Text>
                <TouchableOpacity
                  style={styles.addSectionLink}
                  onPress={() => navigation.navigate('AddTaggedObject')}
                >
                  <Text style={[styles.addSectionLinkText, { color: theme.primary.main }]}>Agregar objeto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              taggedObjects.map((item: any, index: number) => (
                <FadeInView key={item.id} delay={index * 50} duration={350}>
                  {renderTaggedObject({ item })}
                </FadeInView>
              ))
            )}
          </View>
        )}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusPulse: {
    position: 'absolute',
  },
  statusDot: {
    position: 'absolute',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    gap: 4,
  },
  batteryBadgeLow: {
    backgroundColor: '#FFEBEB',
  },
  batteryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deviceCardLowBattery: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
    flex: 1,
  },
  deviceImei: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusActive: {
    color: '#34C759',
  },
  statusConnected: {
    color: '#FF9500',
  },
  statusInactive: {
    color: '#FF3B30',
  },
  lastUpdateText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 4,
  },
  speedText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  foundChatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  foundChatsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  foundChatsInfo: {
    flex: 1,
  },
  foundChatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  foundChatsSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  addSectionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  emptySectionText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySectionHint: {
    fontSize: 13,
    color: '#C7C7CC',
    marginBottom: 8,
  },
  addSectionLink: {
    marginTop: 8,
  },
  addSectionLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  taggedObjectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  taggedObjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taggedObjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qrStatusRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  qrBadgeActive: {
    backgroundColor: '#E8F8ED',
  },
  qrBadgeInactive: {
    backgroundColor: '#F2F2F7',
  },
  qrBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Low battery warning banner
  lowBatteryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  lowBatteryBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lowBatteryBannerContent: {
    flex: 1,
  },
  lowBatteryBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 2,
  },
  lowBatteryBannerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
});
