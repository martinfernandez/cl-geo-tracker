import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type RootStackParamList = {
  UserProfile: { userId: string };
  EventDetail: { eventId: string };
};

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  showName: boolean;
  showEmail: boolean;
  showPublicEvents: boolean;
  createdAt: string;
}

interface Event {
  id: string;
  type: 'THEFT' | 'LOST' | 'ACCIDENT' | 'FIRE' | 'OTHER';
  description: string;
  status: 'IN_PROGRESS' | 'CLOSED';
  isUrgent: boolean;
  createdAt: string;
  images?: { url: string }[];
}

const EVENT_ICONS = {
  THEFT: 'warning',
  LOST: 'search',
  ACCIDENT: 'medical',
  FIRE: 'flame',
  OTHER: 'alert-circle',
};

const EVENT_COLORS = {
  THEFT: '#FF3B30',
  LOST: '#FF9500',
  ACCIDENT: '#FF2D55',
  FIRE: '#FF3B30',
  OTHER: '#8E8E93',
};

const EVENT_LABELS = {
  THEFT: 'Robo',
  LOST: 'Perdido',
  ACCIDENT: 'Accidente',
  FIRE: 'Incendio',
  OTHER: 'Otro',
};

export default function UserProfileScreen() {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation();
  const userId = route.params?.userId;

  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadEvents();
    } else {
      setLoading(false);
      setError('ID de usuario no proporcionado');
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/users/${userId}/profile`);
      setProfile(response.data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setError('No se pudo cargar el perfil del usuario');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await api.get(`/users/${userId}/events`);
      setEvents(response.data);
    } catch (error: any) {
      console.error('Error loading events:', error);
      // Don't show error for events, just show empty state
    } finally {
      setLoadingEvents(false);
    }
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const eventColor = EVENT_COLORS[item.type];
    const eventIcon = EVENT_ICONS[item.type];
    const eventLabel = EVENT_LABELS[item.type];

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetail' as never, { eventId: item.id } as never)}
      >
        <View style={[styles.eventIconContainer, { backgroundColor: eventColor }]}>
          <Ionicons name={eventIcon as any} size={24} color="#fff" />
        </View>

        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventType}>{eventLabel}</Text>
            {item.isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>Urgente</Text>
              </View>
            )}
          </View>

          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.eventFooter}>
            <Text style={styles.eventDate}>
              {format(new Date(item.createdAt), "d MMM yyyy 'a las' HH:mm", { locale: es })}
            </Text>
            <View style={[
              styles.statusBadge,
              item.status === 'CLOSED' && styles.statusBadgeClosed
            ]}>
              <Text style={[
                styles.statusText,
                item.status === 'CLOSED' && styles.statusTextClosed
              ]}>
                {item.status === 'IN_PROGRESS' ? 'En progreso' : 'Cerrado'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#262626" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#262626" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#8E8E93" />
          <Text style={styles.errorTitle}>Usuario no encontrado</Text>
          <Text style={styles.errorMessage}>{error || 'El perfil no existe'}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayName = profile.showName ? profile.name : 'Usuario Anónimo';
  const memberSince = format(new Date(profile.createdAt), 'MMMM yyyy', { locale: es });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayName}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* User Info */}
          <Text style={styles.userName}>{displayName}</Text>

          {profile.showEmail && profile.email && (
            <Text style={styles.userEmail}>{profile.email}</Text>
          )}

          <Text style={styles.memberSince}>
            Miembro desde {memberSince}
          </Text>
        </View>

        {/* Events Section */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Eventos Públicos</Text>

          {!profile.showPublicEvents ? (
            <View style={styles.emptyState}>
              <Ionicons name="lock-closed" size={48} color="#8E8E93" />
              <Text style={styles.emptyStateTitle}>Eventos privados</Text>
              <Text style={styles.emptyStateMessage}>
                Este usuario ha ocultado sus eventos públicos
              </Text>
            </View>
          ) : loadingEvents ? (
            <View style={styles.loadingEventsContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando eventos...</Text>
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyStateTitle}>Sin eventos públicos</Text>
              <Text style={styles.emptyStateMessage}>
                Este usuario no tiene eventos públicos
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {events.map((item) => (
                <React.Fragment key={item.id}>
                  {renderEventItem({ item })}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#fff',
  },
  backButton: {
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
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FAFAFA',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    backgroundColor: '#fff',
    paddingVertical: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 13,
    color: '#8E8E93',
  },
  eventsSection: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  eventsList: {
    paddingHorizontal: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginRight: 8,
  },
  urgentBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  eventDescription: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
    marginBottom: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeClosed: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2196F3',
  },
  statusTextClosed: {
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },
});
