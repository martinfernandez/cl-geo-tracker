import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { areaApi, AreaOfInterest } from '../services/api';

export default function AreasSearchScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [areas, setAreas] = useState<AreaOfInterest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setSearched(true);
      const data = await areaApi.search({ query: searchQuery });
      setAreas(data);
    } catch (error) {
      console.error('Error searching areas:', error);
      Alert.alert('Error', 'No se pudieron buscar las áreas');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (area: AreaOfInterest) => {
    if (area.visibility === 'PUBLIC') {
      try {
        await areaApi.join(area.id);
        Alert.alert('Éxito', `Te has unido a "${area.name}"`);
        handleSearch(); // Refresh
      } catch (error) {
        console.error('Error joining area:', error);
        Alert.alert('Error', 'No se pudo unir al área');
      }
    } else if (area.visibility === 'PRIVATE_SHAREABLE') {
      try {
        await areaApi.requestJoin(area.id);
        Alert.alert(
          'Solicitud Enviada',
          `Tu solicitud para unirte a "${area.name}" ha sido enviada al administrador`
        );
        handleSearch(); // Refresh
      } catch (error) {
        console.error('Error requesting to join:', error);
        Alert.alert('Error', 'No se pudo enviar la solicitud');
      }
    }
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

    return (
      <TouchableOpacity
        style={styles.areaCard}
        onPress={() => navigation.navigate('AreaDetail', { areaId: item.id })}
      >
        <View style={styles.areaHeader}>
          <View style={styles.areaInfo}>
            <Text style={styles.areaName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.areaDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.metadata}>
              <View style={styles.metaItem}>
                <Ionicons name="people" size={14} color="#666" />
                <Text style={styles.metaText}>{item.memberCount} miembros</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="radio" size={14} color="#666" />
                <Text style={styles.metaText}>{(item.radius / 1000).toFixed(1)} km</Text>
              </View>
            </View>
          </View>

          <View style={styles.rightSection}>
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

            {!item.isMember && !item.hasPendingRequest && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  item.visibility === 'PRIVATE_SHAREABLE'
                    ? styles.requestButton
                    : styles.joinButton,
                ]}
                onPress={() => handleJoin(item)}
              >
                <Ionicons
                  name={
                    item.visibility === 'PRIVATE_SHAREABLE' ? 'mail' : 'add-circle'
                  }
                  size={20}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>
                  {item.visibility === 'PRIVATE_SHAREABLE' ? 'Solicitar' : 'Unirse'}
                </Text>
              </TouchableOpacity>
            )}

            {item.hasPendingRequest && (
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={16} color="#FF9500" />
                <Text style={styles.pendingText}>Pendiente</Text>
              </View>
            )}

            {item.isMember && (
              <View style={styles.memberBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.memberText}>Miembro</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>Buscar Áreas</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchButton, !searchQuery && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={!searchQuery || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Buscar</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Buscando áreas...</Text>
        </View>
      ) : searched && areas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No se encontraron áreas</Text>
          <Text style={styles.emptyText}>
            Intenta con otro término de búsqueda
          </Text>
        </View>
      ) : !searched ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="compass-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Busca áreas de interés</Text>
          <Text style={styles.emptyText}>
            Encuentra áreas públicas o privadas compartibles para unirte
          </Text>
        </View>
      ) : (
        <FlatList
          data={areas}
          renderItem={renderAreaItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#262626',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  areaInfo: {
    flex: 1,
    marginRight: 12,
  },
  areaName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  areaDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  visibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visibilityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinButton: {
    backgroundColor: '#34C759',
  },
  requestButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memberText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
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
    color: '#666',
    textAlign: 'center',
  },
});
