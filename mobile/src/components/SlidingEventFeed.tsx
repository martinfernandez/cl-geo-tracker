import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, reactionApi } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.2;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.8;
const DRAG_THRESHOLD = 50;

interface EventWithCounts extends Event {
  reactionCount?: number;
  commentCount?: number;
  userReacted?: boolean;
}

interface Props {
  events: EventWithCounts[];
  onEventPress?: (eventId: string) => void;
  onStatusChange?: (eventId: string, newStatus: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onFilterPress?: () => void;
  onCommentPress?: (eventId: string) => void;
}

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

export default function SlidingEventFeed({
  events,
  onEventPress,
  onStatusChange,
  onRefresh,
  refreshing = false,
  onFilterPress,
  onCommentPress,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localEvents, setLocalEvents] = useState<EventWithCounts[]>(events);
  const height = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  React.useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const currentHeight = isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
        const newHeight = currentHeight - gestureState.dy;
        // Limit movement between collapsed and expanded heights
        if (newHeight >= COLLAPSED_HEIGHT && newHeight <= EXPANDED_HEIGHT) {
          height.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -DRAG_THRESHOLD && !isExpanded) {
          // Slide up
          expandFeed();
        } else if (gestureState.dy > DRAG_THRESHOLD && isExpanded) {
          // Slide down
          collapseFeed();
        } else {
          // Return to current state
          Animated.spring(height, {
            toValue: isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const expandFeed = () => {
    setIsExpanded(true);
    Animated.spring(height, {
      toValue: EXPANDED_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const collapseFeed = () => {
    setIsExpanded(false);
    Animated.spring(height, {
      toValue: COLLAPSED_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleReactionPress = async (event: EventWithCounts) => {
    try {
      const result = await reactionApi.toggleReaction(event.id);

      // Update local state optimistically
      setLocalEvents(prevEvents =>
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

  const renderEventCard = ({ item }: { item: EventWithCounts }) => (
    <View style={[styles.card, (item as any).isUrgent && styles.urgentCard]}>
      {(item as any).isUrgent && (
        <View style={styles.urgentBanner}>
          <Ionicons name="warning" size={16} color="#fff" />
          <Text style={styles.urgentBannerText}>ALERTA URGENTE</Text>
        </View>
      )}
      <TouchableOpacity
        onPress={() => onEventPress?.(item.id)}
        activeOpacity={0.7}
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
            {item.device?.name || 'Sin dispositivo'}
          </Text>
          <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
        </View>

        {item.imageUrl && (
          <Image
            source={{ uri: `http://192.168.0.69:3000${item.imageUrl}` }}
            style={styles.eventImage}
          />
        )}
      </TouchableOpacity>

      {/* Interaction buttons */}
      <View style={styles.interactionBar}>
        <TouchableOpacity
          style={styles.interactionButton}
          onPress={() => handleReactionPress(item)}
        >
          <Ionicons
            name={item.userReacted ? 'heart' : 'heart-outline'}
            size={24}
            color={item.userReacted ? '#ed4956' : '#262626'}
          />
          <Text style={styles.interactionCount}>
            {(item.reactionCount || 0).toString()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.interactionButton}
          onPress={() => onCommentPress?.(item.id)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={24}
            color="#262626"
          />
          <Text style={styles.interactionCount}>
            {(item.commentCount || 0).toString()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: height,
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.header}>
        <View style={styles.dragIndicator} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Eventos ({events.length})
          </Text>
          {onFilterPress && (
            <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
              <Text style={styles.filterButtonText}>⚙️ Filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={localEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh}
        refreshing={refreshing}
        scrollEnabled={isExpanded}
        showsVerticalScrollIndicator={isExpanded}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay eventos en esta área</Text>
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FF9500',
  },
  statusBadgeClosed: {
    backgroundColor: '#34C759',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  cardDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: '#666',
  },
  eventImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginTop: 8,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  interactionBar: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 20,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  interactionCount: {
    fontSize: 14,
    color: '#262626',
    fontWeight: '600',
    marginLeft: 4,
  },
  urgentCard: {
    borderWidth: 2,
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  urgentBanner: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
    marginBottom: 8,
    borderRadius: 4,
  },
  urgentBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
