import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { areaApi, AreaOfInterest, api } from '../services/api';
import { useMapStore } from '../store/useMapStore';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { ObjectsPatternBackground } from '../components/ObjectsPatternBackground';
import { FadeInView } from '../components/FadeInView';

export default function AreasListScreen({ navigation, route }: any) {
  const { showSuccess, showError } = useToast();
  const { theme, isDark } = useTheme();
  const [areas, setAreas] = useState<AreaOfInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAreas();
  }, []);

  // Handle refresh parameter from navigation
  useEffect(() => {
    if (route.params?.refresh) {
      loadAreas();
      // Reset the param to avoid triggering on every render
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh]);

  // Reload areas when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAreas();
    });
    return unsubscribe;
  }, [navigation]);

  const loadAreas = async () => {
    try {
      setLoading(true);
      const data = await areaApi.getMyAreas();
      setAreas(data);
    } catch (error) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAreas();
    setRefreshing(false);
  };

  const handleViewOnMap = (area: AreaOfInterest) => {
    // Set the pending center area in the store
    useMapStore.getState().setPendingCenterArea({
      latitude: area.latitude,
      longitude: area.longitude,
      radius: area.radius,
      name: area.name,
    });
    // Navigate to the Map tab
    navigation.navigate('Main', { screen: 'Map' });
  };

  const handleToggleNotifications = async (area: AreaOfInterest) => {
    try {
      const newValue = !area.notificationsEnabled;
      const response = await api.put(`/areas/${area.id}/notifications`, {
        enabled: newValue,
      });

      // Update local state
      setAreas((prev) =>
        prev.map((a) =>
          a.id === area.id
            ? { ...a, notificationsEnabled: response.data.notificationsEnabled }
            : a
        )
      );

      showSuccess(newValue ? 'Notificaciones activadas' : 'Notificaciones silenciadas');
    } catch (error) {
      console.error('Error toggling notifications:', error);
      showError('No se pudo cambiar la configuración');
    }
  };

  const renderAreaItem = ({ item, index }: { item: AreaOfInterest; index: number }) => {
    const visibilityLabels = {
      PUBLIC: 'Pública',
      PRIVATE_SHAREABLE: 'Privada (Compartible)',
      PRIVATE: 'Privada',
    };

    const visibilityColors = {
      PUBLIC: '#34C759',
      PRIVATE_SHAREABLE: '#FF9500',
      PRIVATE: '#8E8E93',
    };

    const hasPendingRequests = item.pendingRequestsCount && item.pendingRequestsCount > 0;
    const hasNewEvents = (item as any).newEventsCount && (item as any).newEventsCount > 0;
    const notificationsEnabled = (item as any).notificationsEnabled !== false;

    return (
      <FadeInView delay={index * 50} duration={350}>
      <View style={[styles.areaCard, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={styles.areaCardContent}
          onPress={() => navigation.navigate('AreaDetail', { areaId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.areaHeader}>
            <View style={styles.areaInfo}>
              <View style={styles.areaNameRow}>
                <Text style={[styles.areaName, { color: theme.text }]} numberOfLines={1}>{item.name || ''}</Text>
                {hasPendingRequests ? (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{item.pendingRequestsCount}</Text>
                  </View>
                ) : null}
                {hasNewEvents ? (
                  <View style={styles.eventsBadge}>
                    <Text style={styles.eventsBadgeText}>{(item as any).newEventsCount}</Text>
                  </View>
                ) : null}
              </View>
              {item.description ? (
                <Text style={[styles.areaDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.areaFooter}>
            <View style={styles.footerLeft}>
              <View
                style={[
                  styles.visibilityBadge,
                  { backgroundColor: visibilityColors[item.visibility] || '#8E8E93' },
                ]}
              >
                <Text style={styles.visibilityText}>
                  {visibilityLabels[item.visibility] || 'Privada'}
                </Text>
              </View>
              {item.userRole ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>
                    {item.userRole === 'ADMIN' ? 'Admin' : 'Miembro'}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.footerRight}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={14} color={theme.textSecondary} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>{item.memberCount ?? 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="radio" size={14} color={theme.textSecondary} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>{((item.radius || 0) / 1000).toFixed(1)} km</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions Row */}
        <View style={[styles.quickActionsRow, { borderTopColor: isDark ? '#3A3A3C' : '#F2F2F7' }]}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleViewOnMap(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="map-outline" size={20} color={theme.primary.main} />
            <Text style={[styles.quickActionText, { color: theme.primary.main }]}>Mapa</Text>
          </TouchableOpacity>

          <View style={[styles.quickActionDivider, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5E5' }]} />

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleToggleNotifications(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={notificationsEnabled ? 'notifications' : 'notifications-off-outline'}
              size={20}
              color={notificationsEnabled ? '#34C759' : theme.textSecondary}
            />
            <Text style={[styles.quickActionText, { color: notificationsEnabled ? '#34C759' : theme.textSecondary }]}>
              {notificationsEnabled ? 'Activas' : 'Silenciadas'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.quickActionDivider, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5E5' }]} />

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AreaDetail', { areaId: item.id })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>Detalles</Text>
          </TouchableOpacity>
        </View>
      </View>
      </FadeInView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary.main} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando áreas...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* SVG Background Pattern */}
      <ObjectsPatternBackground />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Mis Áreas</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateArea')}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={28} color={theme.primary.main} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={areas}
        renderItem={renderAreaItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          areas.length === 0 && styles.emptyListContainer,
        ]}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No tienes áreas de interés</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Crea una nueva área o busca áreas públicas para unirte
            </Text>
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: theme.primary.main }]}
              onPress={() => navigation.navigate('AreasSearch')}
            >
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchButtonText}>Buscar Áreas</Text>
            </TouchableOpacity>
          </View>
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
    padding: 8,
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  emptyListContainer: {
    justifyContent: 'center',
  },
  areaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  areaCardContent: {
    padding: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingVertical: 10,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  quickActionDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E5E5',
  },
  areaHeader: {
    marginBottom: 12,
  },
  areaInfo: {
    flex: 1,
  },
  areaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  areaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  pendingBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  eventsBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  eventsBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  areaDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  visibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  visibilityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  areaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    flex: 1,
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
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  searchButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
