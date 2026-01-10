import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface DeviceWithPosition {
  id: string;
  name?: string | null;
  imei?: string | null;
  color?: string | null;
  positions?: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
  }>;
}

interface DevicesModalProps {
  visible: boolean;
  onClose: () => void;
  devices: DeviceWithPosition[];
  onSelectDevice: (device: DeviceWithPosition) => void;
}

export default function DevicesModal({
  visible,
  onClose,
  devices,
  onSelectDevice,
}: DevicesModalProps) {
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter devices with positions and by search
  const filteredDevices = useMemo(() => {
    let result = devices.filter(
      (device) => device.positions && device.positions.length > 0
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((d) =>
        d.name?.toLowerCase().includes(query) ||
        d.imei?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [devices, searchQuery]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString('es');
  };

  const renderDeviceItem = ({ item }: { item: DeviceWithPosition }) => {
    const initial = (item.name || item.imei || '?').charAt(0).toUpperCase();
    const lastPosition = item.positions?.[0];
    const deviceColor = item.color || '#007AFF';

    return (
      <TouchableOpacity
        style={[styles.deviceItem, { borderBottomColor: isDark ? '#3A3A3C' : '#E5E5E5' }]}
        onPress={() => {
          onSelectDevice(item);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.deviceAvatar, { backgroundColor: deviceColor }]}>
          <Ionicons name="hardware-chip" size={20} color="#fff" />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={[styles.deviceName, { color: theme.text }]}>{item.name || 'Sin nombre'}</Text>
          <View style={styles.deviceMeta}>
            {item.imei && (
              <View style={[styles.imeiBadge, { backgroundColor: isDark ? '#3A3A3C' : '#F2F2F7' }]}>
                <Text style={[styles.imeiText, { color: theme.textSecondary }]}>
                  {item.imei.slice(-6)}
                </Text>
              </View>
            )}
            {lastPosition && (
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                {formatTime(lastPosition.timestamp)}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="locate-outline" size={24} color={theme.primary.main} />
      </TouchableOpacity>
    );
  };

  const devicesWithPosition = devices.filter(
    (d) => d.positions && d.positions.length > 0
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle Bar */}
          <View style={[styles.handleBar, { backgroundColor: isDark ? '#48484A' : '#D1D1D6' }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="hardware-chip-outline" size={24} color={theme.primary.main} />
              <Text style={[styles.title, { color: theme.text }]}>Mis Dispositivos</Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {devicesWithPosition.length > 0
                ? `${devicesWithPosition.length} dispositivo${devicesWithPosition.length !== 1 ? 's' : ''} con ubicacion`
                : 'Sin dispositivos con ubicacion'}
            </Text>
          </View>

          {/* Search */}
          {devicesWithPosition.length > 3 && (
            <View style={[styles.searchContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Buscar dispositivo..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Devices List */}
          {devicesWithPosition.length > 0 ? (
            <FlatList
              data={filteredDevices}
              renderItem={renderDeviceItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                searchQuery.length > 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      No se encontraron dispositivos
                    </Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="hardware-chip-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin ubicaciones</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Tus dispositivos GPS apareceran aqui cuando reporten su ubicacion
              </Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: theme.primary.main }]}>Cerrar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginLeft: 34,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deviceAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imeiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imeiText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  timeText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
