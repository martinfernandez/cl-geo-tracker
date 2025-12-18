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
import { areaApi, AreaOfInterest } from '../services/api';

export default function AreasListScreen({ navigation, route }: any) {
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
    navigation.navigate('Main', {
      screen: 'Map',
      params: {
        centerArea: {
          latitude: area.latitude,
          longitude: area.longitude,
          radius: area.radius,
          name: area.name,
        },
      },
    });
  };

  const renderAreaItem = ({ item }: { item: AreaOfInterest }) => {
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

    return (
      <View style={styles.areaCard}>
        <TouchableOpacity
          style={styles.areaCardContent}
          onPress={() => navigation.navigate('AreaDetail', { areaId: item.id })}
        >
          <View style={styles.areaHeader}>
            <View style={styles.areaInfo}>
              <View style={styles.areaNameRow}>
                <Text style={styles.areaName}>{item.name}</Text>
                {hasPendingRequests && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{item.pendingRequestsCount}</Text>
                  </View>
                )}
              </View>
              {item.description && (
                <Text style={styles.areaDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.visibilityBadge,
                { backgroundColor: visibilityColors[item.visibility] },
              ]}
            >
              <Text style={styles.visibilityText}>
                {visibilityLabels[item.visibility]}
              </Text>
            </View>
          </View>

          <View style={styles.areaFooter}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color="#666" />
              <Text style={styles.statText}>{item.memberCount} miembros</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="radio" size={16} color="#666" />
              <Text style={styles.statText}>{(item.radius / 1000).toFixed(1)} km</Text>
            </View>
            {item.userRole && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {item.userRole === 'ADMIN' ? 'Admin' : 'Miembro'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => handleViewOnMap(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="map" size={20} color="#fff" />
          <Text style={styles.viewButtonText}>Ver en Mapa</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando áreas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Áreas</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateArea')}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={areas}
        renderItem={renderAreaItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No tienes áreas de interés</Text>
            <Text style={styles.emptyText}>
              Crea una nueva área o busca áreas públicas para unirte
            </Text>
            <TouchableOpacity
              style={styles.searchButton}
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
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 0,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  areaInfo: {
    flex: 1,
    marginRight: 12,
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
  areaDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  visibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  visibilityText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  areaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  roleBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
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
