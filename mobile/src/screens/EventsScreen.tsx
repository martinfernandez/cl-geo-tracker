import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Dimensions,
  Share,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { eventApi, reactionApi, Event } from '../services/api';
import { BASE_URL } from '../config/environment';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { ObjectsPatternBackground } from '../components/ObjectsPatternBackground';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: any;
};

interface EventWithCounts extends Event {
  reactionCount?: number;
  commentCount?: number;
  userReacted?: boolean;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  THEFT: { label: 'Robo', color: colors.error.main, icon: 'warning' },
  LOST: { label: 'Extravio', color: colors.accent.main, icon: 'help-circle' },
  ACCIDENT: { label: 'Accidente', color: colors.warning.main, icon: 'car' },
  FIRE: { label: 'Incendio', color: '#FF2D55', icon: 'flame' },
  GENERAL: { label: 'General', color: colors.primary.main, icon: 'alert-circle' },
};

// Format relative time like social feeds
const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'hace un momento';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return diffInMinutes === 1 ? 'hace 1 min' : `hace ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return diffInHours === 1 ? 'hace 1 hora' : `hace ${diffInHours} horas`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return diffInDays === 1 ? 'hace 1 dia' : `hace ${diffInDays} dias`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return diffInWeeks === 1 ? 'hace 1 semana' : `hace ${diffInWeeks} semanas`;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
};

// Animated empty state illustration
const AnimatedEmptyIllustration = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={emptyStyles.illustrationContainer}>
      <Animated.View
        style={[
          emptyStyles.illustrationWrapper,
          {
            transform: [
              { scale: pulseAnim },
              { translateY: floatAnim },
            ],
          },
        ]}
      >
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r="55" fill="#F0F4FF" />
          <Circle cx="60" cy="60" r="45" fill="none" stroke="#E0E7FF" strokeWidth="1" strokeDasharray="4 4" />
          <Circle cx="60" cy="60" r="35" fill="none" stroke="#E0E7FF" strokeWidth="1" strokeDasharray="4 4" />
          <Circle cx="60" cy="60" r="25" fill="none" stroke="#E0E7FF" strokeWidth="1" />
          <G>
            <Path
              d="M60 30 C45 30 35 42 35 55 C35 75 60 90 60 90 C60 90 85 75 85 55 C85 42 75 30 60 30 Z"
              fill={colors.primary.main}
            />
            <Circle cx="60" cy="52" r="10" fill="#fff" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

const emptyStyles = StyleSheet.create({
  illustrationContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustrationWrapper: {
    position: 'absolute',
  },
});

export default function EventsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useToast();
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (route?.params?.refresh) {
      loadEvents();
      navigation.setParams({ refresh: undefined });
    }
  }, [route?.params?.refresh]);

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
      showError('No se pudieron cargar los eventos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      await eventApi.update(eventId, { status: newStatus });
      await loadEvents();
      showSuccess(newStatus === 'CLOSED' ? 'Evento cerrado' : 'Evento reabierto');
    } catch (error) {
      console.error('Error updating status:', error);
      showError('No se pudo actualizar el estado');
    }
  };

  const handleReactionPress = async (event: EventWithCounts) => {
    try {
      const result = await reactionApi.toggleReaction(event.id);
      setEvents(prevEvents =>
        prevEvents.map(e =>
          e.id === event.id
            ? {
                ...e,
                userReacted: result.liked,
                reactionCount: (e.reactionCount || 0) + (result.liked ? 1 : -1),
              }
            : e
        )
      );
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleShareEvent = async (event: EventWithCounts) => {
    const shareUrl = `${BASE_URL}/e/${event.id}`;
    const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.GENERAL;
    const title = `${config.label}: ${event.description.slice(0, 50)}${event.description.length > 50 ? '...' : ''}`;
    const message = `${title}\n\n${shareUrl}`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing event:', error);
      Alert.alert('Error', 'No se pudo compartir el evento');
    }
  };

  const handleCommentPress = (eventId: string) => {
    navigation.navigate('EventDetail', { eventId, openComments: true });
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'active') return event.status === 'IN_PROGRESS';
    if (filter === 'closed') return event.status === 'CLOSED';
    return true;
  });

  const activeCount = events.filter(e => e.status === 'IN_PROGRESS').length;
  const closedCount = events.filter(e => e.status === 'CLOSED').length;

  const renderEventCard = ({ item }: { item: EventWithCounts }) => {
    const config = EVENT_TYPE_CONFIG[item.type] || EVENT_TYPE_CONFIG.GENERAL;
    const isActive = item.status === 'IN_PROGRESS';

    return (
      <View style={[styles.card, { backgroundColor: theme.bg.primary, borderColor: theme.glass.border }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
          activeOpacity={0.85}
        >
          {/* Image at the top - full width */}
          {item.imageUrl && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `${BASE_URL}${item.imageUrl}` }}
                style={styles.eventImage}
              />
              {/* Time badge on image */}
              <View style={[styles.timeBadgeOnImage, { backgroundColor: theme.overlay.dark }]}>
                <Ionicons name="time-outline" size={12} color="#fff" />
                <Text style={styles.timeBadgeText}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
            </View>
          )}

          {/* Card content */}
          <View style={styles.cardContent}>
            {/* Header row: badges left, time right (if no image) */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.typeBadge, { backgroundColor: config.color }]}>
                  <Text style={styles.typeBadgeText}>{config.label}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: isActive ? theme.primary.main : theme.success.main },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {isActive ? 'En Progreso' : 'Cerrado'}
                  </Text>
                </View>
              </View>
              {/* Time on the right if no image */}
              {!item.imageUrl && (
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={12} color={theme.text.tertiary} />
                  <Text style={[styles.timeText, { color: theme.text.tertiary }]}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            <Text style={[styles.description, { color: theme.text.primary }]} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Device info */}
            <View style={styles.deviceRow}>
              <Ionicons name="phone-portrait-outline" size={14} color={theme.text.tertiary} />
              <Text style={[styles.deviceText, { color: theme.text.tertiary }]}>
                {item.device?.name || 'Sin dispositivo'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Interaction bar - social feed style */}
        <View style={[styles.interactionBar, { borderTopColor: theme.glass.border }]}>
          <View style={styles.interactionLeft}>
            <TouchableOpacity
              style={styles.interactionButton}
              onPress={() => handleReactionPress(item)}
            >
              <Ionicons
                name={item.userReacted ? 'heart' : 'heart-outline'}
                size={22}
                color={item.userReacted ? theme.error.main : theme.text.tertiary}
              />
              <Text style={[styles.interactionCount, { color: theme.text.tertiary }, item.userReacted && { color: theme.error.main }]}>
                {(item.reactionCount || 0).toString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.interactionButton}
              onPress={() => handleCommentPress(item.id)}
            >
              <Ionicons name="chatbubble-outline" size={22} color={theme.text.tertiary} />
              <Text style={[styles.interactionCount, { color: theme.text.tertiary }]}>
                {(item.commentCount || 0).toString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.interactionButton}
              onPress={() => handleShareEvent(item)}
            >
              <Ionicons name="paper-plane-outline" size={22} color={theme.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Actions specific to owner */}
          <View style={styles.interactionRight}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.glass.bg }]}
              onPress={() => navigation.navigate('EditEvent', { eventId: item.id })}
            >
              <Ionicons name="create-outline" size={18} color={theme.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonPrimary,
                { backgroundColor: isActive ? colors.success.subtle : colors.accent.subtle }
              ]}
              onPress={() => handleStatusChange(item.id, isActive ? 'CLOSED' : 'IN_PROGRESS')}
            >
              <Ionicons
                name={isActive ? 'checkmark-circle-outline' : 'refresh-outline'}
                size={18}
                color={isActive ? colors.success.main : colors.accent.main}
              />
              <Text style={[styles.actionButtonText, { color: isActive ? colors.success.main : colors.accent.main }]}>
                {isActive ? 'Cerrar' : 'Reabrir'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.secondary }]}>
      {/* SVG Background Pattern with Objects */}
      <ObjectsPatternBackground />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.bg.primary, borderBottomColor: theme.glass.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Mis Eventos</Text>
        <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>
          {events.length} {events.length === 1 ? 'evento' : 'eventos'} registrados
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.bg.primary }]}>
        <TouchableOpacity
          style={[styles.filterTab, { backgroundColor: theme.glass.bg }, filter === 'all' && { backgroundColor: theme.primary.subtle }]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, { color: theme.text.secondary }, filter === 'all' && { color: theme.primary.main }]}>
            Todos
          </Text>
          <View style={[styles.filterBadge, { backgroundColor: theme.glass.borderStrong }, filter === 'all' && { backgroundColor: theme.primary.main }]}>
            <Text style={[styles.filterBadgeText, { color: theme.text.secondary }, filter === 'all' && { color: '#fff' }]}>
              {events.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, { backgroundColor: theme.glass.bg }, filter === 'active' && { backgroundColor: theme.primary.subtle }]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterTabText, { color: theme.text.secondary }, filter === 'active' && { color: theme.primary.main }]}>
            Activos
          </Text>
          <View style={[styles.filterBadge, { backgroundColor: theme.glass.borderStrong }, filter === 'active' && { backgroundColor: theme.primary.main }]}>
            <Text style={[styles.filterBadgeText, { color: theme.text.secondary }, filter === 'active' && { color: '#fff' }]}>
              {activeCount}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, { backgroundColor: theme.glass.bg }, filter === 'closed' && { backgroundColor: theme.primary.subtle }]}
          onPress={() => setFilter('closed')}
        >
          <Text style={[styles.filterTabText, { color: theme.text.secondary }, filter === 'closed' && { color: theme.primary.main }]}>
            Cerrados
          </Text>
          <View style={[styles.filterBadge, { backgroundColor: theme.glass.borderStrong }, filter === 'closed' && { backgroundColor: theme.primary.main }]}>
            <Text style={[styles.filterBadgeText, { color: theme.text.secondary }, filter === 'closed' && { color: '#fff' }]}>
              {closedCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary.main}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AnimatedEmptyIllustration />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              {filter === 'all' ? 'Sin eventos' : filter === 'active' ? 'Sin eventos activos' : 'Sin eventos cerrados'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              {filter === 'all'
                ? 'Crea tu primer evento tocando el boton + en la barra inferior'
                : 'No hay eventos en esta categoria'}
            </Text>
            <View style={[styles.emptyHint, { backgroundColor: theme.primary.subtle }]}>
              <Ionicons name="add-circle-outline" size={16} color={theme.primary.main} />
              <Text style={[styles.emptyHintText, { color: theme.primary.main }]}>
                Toca + para crear uno
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  card: {
    borderRadius: radius.xl,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  timeBadgeOnImage: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    fontWeight: '400',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceText: {
    fontSize: 13,
  },
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  interactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  interactionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 12,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  emptyHintText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
