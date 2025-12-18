import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { eventApi, Event } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Header from '../components/Header';
import FloatingActionButton from '../components/FloatingActionButton';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: any;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  THEFT: 'Robo',
  LOST: 'Extravío',
  ACCIDENT: 'Accidente',
  FIRE: 'Incendio',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  THEFT: '#FF3B30',
  LOST: '#FF9500',
  ACCIDENT: '#FFCC00',
  FIRE: '#FF2D55',
};

export default function EventsScreen({ navigation, route }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  // Handle refresh parameter from navigation
  useEffect(() => {
    if (route?.params?.refresh) {
      loadEvents();
      // Reset the param to avoid triggering on every render
      navigation.setParams({ refresh: undefined });
    }
  }, [route?.params?.refresh]);

  // Reload events when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEvents();
    });
    return unsubscribe;
  }, [navigation]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventApi.getAll();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      await eventApi.update(eventId, { status: newStatus });
      await loadEvents();
      Alert.alert('Éxito', 'Estado actualizado');
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: EVENT_TYPE_COLORS[item.type] },
            ]}
          >
            <Text style={styles.typeBadgeText}>
              {EVENT_TYPE_LABELS[item.type]}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === 'CLOSED' && styles.statusBadgeClosed,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {item.status === 'IN_PROGRESS' ? 'En Progreso' : 'Cerrado'}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>
            Dispositivo: {item.device?.name || 'Sin dispositivo'}
          </Text>
          <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
        </View>

        {item.imageUrl && (
          <Image
            source={{
              uri: `http://192.168.0.69:3000${item.imageUrl}`,
            }}
            style={styles.eventImage}
          />
        )}
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditEvent', { eventId: item.id })}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>

        {item.status === 'IN_PROGRESS' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.closeButton]}
            onPress={() => handleStatusChange(item.id, 'CLOSED')}
          >
            <Text style={styles.actionButtonText}>Cerrar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.reopenButton]}
            onPress={() => handleStatusChange(item.id, 'IN_PROGRESS')}
          >
            <Text style={styles.actionButtonText}>Reabrir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Eventos" />

      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay eventos registrados</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddEvent')}
            >
              <Text style={styles.emptyButtonText}>Crear Primer Evento</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <FloatingActionButton
        icon="+"
        onPress={() => navigation.navigate('AddEvent')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Extra padding for FAB
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF9500',
  },
  statusBadgeClosed: {
    backgroundColor: '#34C759',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  cardDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#34C759',
  },
  reopenButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
