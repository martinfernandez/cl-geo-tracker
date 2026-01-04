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

// Battery indicator component
function BatteryIndicator({ level, isLow }: { level: number | null | undefined; isLow: boolean }) {
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

  return (
    <View style={[styles.batteryBadge, isLow && styles.batteryBadgeLow]}>
      <Ionicons name="battery-half" size={14} color={getBatteryColor()} />
      <Text style={[styles.batteryText, { color: getBatteryColor() }]}>{level}%</Text>
    </View>
  );
}

// Component for the pulsing status indicator
function StatusIndicator({ isActive, size = 'normal' }: { isActive: boolean; size?: 'normal' | 'small' }) {
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
  const color = isActive ? '#34C759' : '#FF3B30';
  // Inactive devices have a more subtle pulse
  const pulseOpacity = isActive ? 0.4 : 0.2;

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

// Calculate if device is reporting recently (within last 5 minutes)
// Use createdAt (server time) instead of timestamp (GPS device time)
// because some GPS devices have incorrect internal clocks
function isDeviceReporting(lastPosition: any): boolean {
  if (!lastPosition) return false;
  const lastUpdate = new Date(lastPosition.createdAt || lastPosition.timestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  return diffMinutes <= 5;
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
    const isReporting = isDeviceReporting(lastPosition);
    // Use createdAt (server time) instead of timestamp (GPS device time)
    const lastUpdateDate = lastPosition
      ? new Date(lastPosition.createdAt || lastPosition.timestamp)
      : null;
    const batteryLevel = (item as any).batteryLevel;
    // Battery = 0 means external power/no battery, so only show low battery warning for 1-20%
    const isLowBattery = batteryLevel !== null && batteryLevel !== undefined && batteryLevel > 0 && batteryLevel <= 20;

    return (
      <TouchableOpacity
        style={[styles.deviceCard, isLowBattery && styles.deviceCardLowBattery]}
        onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}
      >
        <View style={styles.deviceRow}>
          <StatusIndicator isActive={isReporting} />
          <View style={styles.deviceInfo}>
            <View style={styles.deviceHeader}>
              <Text style={styles.deviceName}>{item.name || item.imei}</Text>
              <View style={styles.deviceHeaderRight}>
                <BatteryIndicator level={batteryLevel} isLow={isLowBattery} />
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </View>
            </View>
            <Text style={styles.deviceImei}>IMEI: {item.imei}</Text>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, isReporting ? styles.statusActive : styles.statusInactive]}>
                {isReporting ? 'Reportando' : 'Sin reporte'}
              </Text>
              {lastUpdateDate && (
                <Text style={styles.lastUpdateText}>
                  · {formatTimeAgo(lastUpdateDate)}
                </Text>
              )}
            </View>
            {lastPosition?.speed !== undefined && lastPosition.speed !== null && (
              <Text style={styles.speedText}>
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
        style={styles.taggedObjectCard}
        onPress={() => navigation.navigate('DeviceQR', { deviceId: item.id })}
      >
        <View style={styles.taggedObjectRow}>
          <View style={styles.taggedObjectIcon}>
            <Ionicons name="pricetag" size={24} color="#007AFF" />
          </View>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceHeader}>
              <Text style={styles.deviceName}>{item.name || 'Objeto'}</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </View>
            <View style={styles.qrStatusRow}>
              <View style={[styles.qrBadge, item.qrEnabled ? styles.qrBadgeActive : styles.qrBadgeInactive]}>
                <Ionicons
                  name={item.qrEnabled ? 'qr-code' : 'qr-code-outline'}
                  size={12}
                  color={item.qrEnabled ? '#34C759' : '#8E8E93'}
                />
                <Text style={[styles.qrBadgeText, { color: item.qrEnabled ? '#34C759' : '#8E8E93' }]}>
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#262626" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dispositivos</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispositivos</Text>
        <View style={styles.headerButton} />
      </View>

      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <View style={styles.listContent}>
            {/* Low Battery Warning Banner */}
            {lowBatteryCount > 0 && (
              <View style={styles.lowBatteryBanner}>
                <View style={styles.lowBatteryBannerIcon}>
                  <Ionicons name="battery-dead" size={24} color="#FF3B30" />
                </View>
                <View style={styles.lowBatteryBannerContent}>
                  <Text style={styles.lowBatteryBannerTitle}>
                    {lowBatteryCount === 1 ? '1 dispositivo con batería baja' : `${lowBatteryCount} dispositivos con batería baja`}
                  </Text>
                  <Text style={styles.lowBatteryBannerSubtitle}>
                    {lowBatteryDevices.map((d: any) => d.name || `JX10-${d.imei?.slice(-4)}`).join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Found Chats Link */}
            <TouchableOpacity
              style={styles.foundChatsCard}
              onPress={() => navigation.getParent()?.navigate('FoundChats')}
            >
              <View style={styles.foundChatsIcon}>
                <Ionicons name="search" size={22} color="#FF9500" />
              </View>
              <View style={styles.foundChatsInfo}>
                <Text style={styles.foundChatsTitle}>Objetos Encontrados</Text>
                <Text style={styles.foundChatsSubtitle}>Chats con quienes encontraron tus objetos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            {/* GPS Devices Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="hardware-chip" size={20} color="#34C759" />
                <Text style={styles.sectionTitle}>Dispositivos GPS</Text>
              </View>
              <TouchableOpacity
                style={styles.addSectionButton}
                onPress={() => navigation.navigate('AddDevice')}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {gpsDevices.length === 0 ? (
              <View style={styles.emptySectionCard}>
                <Ionicons name="hardware-chip-outline" size={32} color="#C7C7CC" />
                <Text style={styles.emptySectionText}>No hay dispositivos GPS</Text>
                <TouchableOpacity
                  style={styles.addSectionLink}
                  onPress={() => navigation.navigate('AddDevice')}
                >
                  <Text style={styles.addSectionLinkText}>Agregar dispositivo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              gpsDevices.map((item: any) => (
                <View key={item.id}>{renderGPSDevice({ item })}</View>
              ))
            )}

            {/* Tags Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="pricetag" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Tags</Text>
              </View>
              <TouchableOpacity
                style={styles.addSectionButton}
                onPress={() => navigation.navigate('AddTaggedObject')}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {taggedObjects.length === 0 ? (
              <View style={styles.emptySectionCard}>
                <Ionicons name="pricetag-outline" size={32} color="#C7C7CC" />
                <Text style={styles.emptySectionText}>No hay tags</Text>
                <Text style={styles.emptySectionHint}>Crea codigos QR para tus objetos</Text>
                <TouchableOpacity
                  style={styles.addSectionLink}
                  onPress={() => navigation.navigate('AddTaggedObject')}
                >
                  <Text style={styles.addSectionLinkText}>Agregar objeto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              taggedObjects.map((item: any) => (
                <View key={item.id}>{renderTaggedObject({ item })}</View>
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
