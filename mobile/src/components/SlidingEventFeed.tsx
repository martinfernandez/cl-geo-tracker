import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Easing,
  Share,
  Alert,
} from 'react-native';
import { SkeletonImage } from './SkeletonImage';
import { FadeInView } from './FadeInView';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, G, Rect, Defs, Pattern } from 'react-native-svg';
import { Event, reactionApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { BASE_URL } from '../config/environment';
import { colors as staticColors, radius } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINIMIZED_HEIGHT = 90; // Shows the header with title visible
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.2;
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
  isGroupMode?: boolean;
  groupName?: string;
  startMinimized?: boolean;
}

// Pulsing dot indicator for urgent events
const UrgentPulsingDot = ({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 2.5,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={urgentDotStyles.container}>
      <Animated.View
        style={[
          urgentDotStyles.pulse,
          {
            backgroundColor: color,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      <View style={[urgentDotStyles.dot, { backgroundColor: color }]} />
    </View>
  );
};

const urgentDotStyles = StyleSheet.create({
  container: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

// Animated empty state illustration component - matches onboarding style
const AnimatedEmptyIllustration = ({ isGroupMode }: { isGroupMode: boolean }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseOuter = useRef(new Animated.Value(1)).current;
  const pulseMid = useRef(new Animated.Value(1)).current;

  const iconColor = isGroupMode ? '#007AFF' : '#34C759';

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse on outer ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOuter, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOuter, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Offset pulse on middle ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseMid, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseMid, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        emptyStyles.illustrationContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Outer circle */}
      <Animated.View
        style={[
          emptyStyles.circleOuter,
          {
            backgroundColor: `${iconColor}10`,
            transform: [{ scale: pulseOuter }],
          },
        ]}
      >
        {/* Middle circle */}
        <Animated.View
          style={[
            emptyStyles.circleMiddle,
            {
              backgroundColor: `${iconColor}18`,
              transform: [{ scale: pulseMid }],
            },
          ]}
        >
          {/* Inner circle with icon */}
          <View
            style={[
              emptyStyles.circleInner,
              { backgroundColor: `${iconColor}25` },
            ]}
          >
            <Ionicons
              name={isGroupMode ? 'people-outline' : 'checkmark-circle-outline'}
              size={44}
              color={iconColor}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const emptyStyles = StyleSheet.create({
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleMiddle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Background pattern component with trackable objects (WhatsApp style)
const PatternBackground = React.memo(() => {
  const ICON_COLOR = 'rgba(209, 213, 219, 0.15)'; // Much lower opacity for subtle background
  const ICON_SIZE = 20;
  const PATTERN_SIZE = 55;

  // Simple icon shapes that render reliably
  const renderIcon = (type: number, x: number, y: number, rotation: number) => {
    const transform = `translate(${x}, ${y}) rotate(${rotation}, ${ICON_SIZE/2}, ${ICON_SIZE/2})`;

    switch (type % 8) {
      case 0: // Car
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Path d="M2 8 L4 4 L16 4 L18 8 L18 14 L2 14 Z" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="5" cy="14" r="2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="15" cy="14" r="2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 1: // Key
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Circle cx="14" cy="6" r="4" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M10 6 L2 14 L2 18 L6 18 L6 14 L10 10" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 2: // Bike
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Circle cx="4" cy="14" r="3" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="16" cy="14" r="3" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M4 14 L8 6 L12 6 L16 14 M8 6 L10 14 L12 6" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 3: // Paw
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Circle cx="10" cy="14" r="4" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="5" cy="8" r="2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="15" cy="8" r="2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="7" cy="4" r="1.5" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="13" cy="4" r="1.5" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 4: // Backpack
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Path d="M4 6 L4 18 L16 18 L16 6 L4 6" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M7 6 L7 3 L13 3 L13 6" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M7 10 L13 10 L13 14 L7 14 Z" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 5: // Phone
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Path d="M6 2 L14 2 L14 18 L6 18 Z" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" rx="1" />
            <Circle cx="10" cy="15" r="1.5" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 6: // Location pin
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Path d="M10 2 C6 2 3 5 3 9 C3 14 10 20 10 20 C10 20 17 14 17 9 C17 5 14 2 10 2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="10" cy="9" r="2.5" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 7: // Watch
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Circle cx="10" cy="10" r="6" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M10 6 L10 10 L13 12" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M8 2 L12 2 M8 18 L12 18" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      default:
        return null;
    }
  };

  const rows = Math.ceil(SCREEN_HEIGHT / PATTERN_SIZE) + 2;
  const cols = Math.ceil(SCREEN_WIDTH / PATTERN_SIZE) + 2;

  // Seeded random function for consistent "random" values
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  const icons = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seed = row * 100 + col;
      const offsetX = row % 2 === 0 ? 0 : PATTERN_SIZE / 2;
      // Add random horizontal offset (-8 to +8)
      const randomOffsetX = (seededRandom(seed) - 0.5) * 16;
      // Add random vertical offset (-12 to +12)
      const randomOffsetY = (seededRandom(seed + 50) - 0.5) * 24;
      const x = col * PATTERN_SIZE + offsetX + randomOffsetX;
      const y = row * PATTERN_SIZE + randomOffsetY;
      // Random rotation between -35 and +35 degrees
      const rotation = (seededRandom(seed + 100) - 0.5) * 70;
      const iconType = (row * 7 + col * 3) % 8;
      icons.push(renderIcon(iconType, x, y, rotation));
    }
  }

  return (
    <View style={patternStyles.container} pointerEvents="none">
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
      >
        {icons}
      </Svg>
    </View>
  );
});

const patternStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});

const EVENT_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  THEFT: 'Robo',
  LOST: 'Extravío',
  ACCIDENT: 'Accidente',
  FIRE: 'Incendio',
};

// Format relative time like Instagram/social feeds
const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hace un momento';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? 'hace 1 min' : `hace ${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? 'hace 1 hora' : `hace ${diffInHours} horas`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? 'hace 1 día' : `hace ${diffInDays} días`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? 'hace 1 semana' : `hace ${diffInWeeks} semanas`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? 'hace 1 mes' : `hace ${diffInMonths} meses`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? 'hace 1 año' : `hace ${diffInYears} años`;
};

// Sort events: active urgent first, then by creation date (newest first)
// Closed urgent events are treated as normal events (sorted by date only)
const sortEvents = (events: EventWithCounts[]): EventWithCounts[] => {
  return [...events].sort((a, b) => {
    // Only active urgent events (not closed) get priority
    const aActiveUrgent = (a as any).isUrgent && a.status !== 'CLOSED' ? 1 : 0;
    const bActiveUrgent = (b as any).isUrgent && b.status !== 'CLOSED' ? 1 : 0;
    if (bActiveUrgent !== aActiveUrgent) {
      return bActiveUrgent - aActiveUrgent;
    }
    // Then by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  GENERAL: staticColors.primary.main,
  THEFT: staticColors.error.main,
  LOST: staticColors.accent.main,
  ACCIDENT: staticColors.warning.main,
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
  isGroupMode = false,
  groupName,
  startMinimized = false,
}: Props) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate header safe area dynamically based on device safe area insets
  // Header height = insets.top + padding (4) + content (~44) + padding (8) + extra margin
  // Use Math.max to ensure minimum safe area even if insets aren't loaded yet
  const HEADER_SAFE_AREA = Math.max(insets.top + 80, 140);
  // Leave 10% of the map visible when expanded (90% of available space)
  const MAP_VISIBLE_PERCENT = 0.10;
  const EXPANDED_HEIGHT = (SCREEN_HEIGHT - HEADER_SAFE_AREA) * (1 - MAP_VISIBLE_PERCENT);

  // State: 'minimized' | 'collapsed' | 'expanded'
  const [feedState, setFeedState] = useState<'minimized' | 'collapsed' | 'expanded'>(
    startMinimized ? 'minimized' : 'collapsed'
  );
  const [localEvents, setLocalEvents] = useState<EventWithCounts[]>(events);
  const initialHeight = startMinimized ? MINIMIZED_HEIGHT : COLLAPSED_HEIGHT;
  const height = useRef(new Animated.Value(initialHeight)).current;

  // Keep refs updated for pan responder (closures don't update)
  const expandedHeightRef = useRef(EXPANDED_HEIGHT);
  expandedHeightRef.current = EXPANDED_HEIGHT;
  const feedStateRef = useRef(feedState);
  feedStateRef.current = feedState;

  // Update height when startMinimized changes
  useEffect(() => {
    if (startMinimized) {
      setFeedState('minimized');
      Animated.spring(height, {
        toValue: MINIMIZED_HEIGHT,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [startMinimized]);

  React.useEffect(() => {
    setLocalEvents(sortEvents(events));
  }, [events]);

  // Get current height based on state - uses ref for expanded height
  const getCurrentHeight = () => {
    switch (feedState) {
      case 'minimized': return MINIMIZED_HEIGHT;
      case 'collapsed': return COLLAPSED_HEIGHT;
      case 'expanded': return expandedHeightRef.current;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const currentState = feedStateRef.current;
        const baseHeight = currentState === 'minimized' ? MINIMIZED_HEIGHT :
                           currentState === 'collapsed' ? COLLAPSED_HEIGHT :
                           expandedHeightRef.current;
        const newHeight = baseHeight - gestureState.dy;
        // Limit movement between minimized and expanded heights
        if (newHeight >= MINIMIZED_HEIGHT && newHeight <= expandedHeightRef.current) {
          height.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentState = feedStateRef.current;
        const currentHeight = currentState === 'minimized' ? MINIMIZED_HEIGHT :
                              currentState === 'collapsed' ? COLLAPSED_HEIGHT :
                              expandedHeightRef.current;

        if (gestureState.dy < -DRAG_THRESHOLD) {
          // Swiping up
          if (currentState === 'minimized') {
            setToCollapsed();
          } else if (currentState === 'collapsed') {
            setToExpanded();
          } else {
            // Already expanded, spring back
            Animated.spring(height, {
              toValue: expandedHeightRef.current,
              useNativeDriver: false,
            }).start();
          }
        } else if (gestureState.dy > DRAG_THRESHOLD) {
          // Swiping down
          if (currentState === 'expanded') {
            setToCollapsed();
          } else if (currentState === 'collapsed') {
            setToMinimized();
          } else {
            // Already minimized, spring back
            Animated.spring(height, {
              toValue: MINIMIZED_HEIGHT,
              useNativeDriver: false,
            }).start();
          }
        } else {
          // Return to current state
          Animated.spring(height, {
            toValue: currentHeight,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const setToMinimized = () => {
    setFeedState('minimized');
    Animated.spring(height, {
      toValue: MINIMIZED_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const setToCollapsed = () => {
    setFeedState('collapsed');
    Animated.spring(height, {
      toValue: COLLAPSED_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const setToExpanded = () => {
    setFeedState('expanded');
    Animated.spring(height, {
      toValue: expandedHeightRef.current,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
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

  const handleShareEvent = async (event: EventWithCounts) => {
    const shareUrl = `${BASE_URL}/e/${event.id}`;
    const eventTypeLabels: Record<string, string> = {
      THEFT: 'Robo',
      LOST: 'Extravío',
      ACCIDENT: 'Accidente',
      FIRE: 'Incendio',
    };

    const title = `🚨 ${eventTypeLabels[event.type] || 'Alerta'}: ${event.description.slice(0, 50)}${event.description.length > 50 ? '...' : ''}`;
    // Include URL in message for Android compatibility (WhatsApp, etc.)
    const message = `${title}\n\n${shareUrl}`;

    try {
      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
      Alert.alert('Error', 'No se pudo compartir el evento');
    }
  };

  const renderEventCard = ({ item, index }: { item: EventWithCounts; index: number }) => {
    // Only show urgent styling if event is urgent AND not closed
    const isActiveUrgent = (item as any).isUrgent && item.status !== 'CLOSED';

    return (
      <FadeInView delay={index * 50} duration={350}>
      <View style={[
        styles.card,
        { backgroundColor: theme.surface },
        isActiveUrgent && { borderColor: theme.error.main, borderWidth: 2 }
      ]}>
      <TouchableOpacity
        onPress={() => onEventPress?.(item.id)}
        activeOpacity={0.85}
      >
        {/* Image at the top - full width */}
        {item.imageUrl && (
          <View style={styles.imageContainer}>
            <SkeletonImage
              source={{ uri: item.imageUrl.startsWith('http') ? item.imageUrl : `${BASE_URL}${item.imageUrl}` }}
              style={styles.eventImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {/* Gradient overlay for better text readability */}
            <View style={styles.imageOverlay} />
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
              {/* Status badge */}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: staticColors.success.subtle },
                  item.status === 'CLOSED' && { backgroundColor: staticColors.error.main },
                ]}
              >
                <Text style={[
                  styles.statusBadgeText,
                  { color: staticColors.success.dark },
                  item.status === 'CLOSED' && { color: '#fff' },
                ]}>
                  {item.status === 'IN_PROGRESS' ? 'En Progreso' : 'Cerrado'}
                </Text>
              </View>
              {isActiveUrgent && <UrgentPulsingDot color={theme.error.main} />}
              {item.status === 'CLOSED' && (
                <View style={styles.closedStaticDot} />
              )}
            </View>
            {/* Time on the right if no image */}
            {!item.imageUrl && (
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color={theme.textTertiary} />
                <Text style={[styles.timeText, { color: theme.textTertiary }]}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: theme.text }]} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Device info */}
          <View style={styles.deviceRow}>
            <Ionicons name="phone-portrait-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.deviceText, { color: theme.textTertiary }]}>
              {item.device?.name || 'Sin dispositivo'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Interaction buttons */}
      <View style={[styles.interactionBar, { borderTopColor: theme.glass.border }]}>
        <TouchableOpacity
          style={styles.interactionButton}
          onPress={() => handleReactionPress(item)}
        >
          <Ionicons
            name={item.userReacted ? 'heart' : 'heart-outline'}
            size={22}
            color={item.userReacted ? theme.error.main : theme.textTertiary}
          />
          <Text style={[styles.interactionCount, { color: theme.textTertiary }, item.userReacted && { color: theme.error.main }]}>
            {(item.reactionCount || 0).toString()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.interactionButton}
          onPress={() => onCommentPress?.(item.id)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={22}
            color={theme.textTertiary}
          />
          <Text style={[styles.interactionCount, { color: theme.textTertiary }]}>
            {(item.commentCount || 0).toString()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.interactionButton}
          onPress={() => handleShareEvent(item)}
        >
          <Ionicons name="paper-plane-outline" size={22} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
      </FadeInView>
  );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: height,
          zIndex: feedState === 'minimized' ? 50 : 100,
          backgroundColor: theme.bg,
        },
      ]}
    >
      {/* Background pattern */}
      <PatternBackground />

      <View {...panResponder.panHandlers} style={[styles.header, { backgroundColor: theme.bg }]}>
        <View style={[styles.dragIndicator, { backgroundColor: theme.glass.borderStrong }]} />
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            {isGroupMode && (
              <View style={[styles.groupIndicator, { backgroundColor: theme.primary.subtle }]}>
                <Ionicons name="people" size={14} color={theme.primary.main} />
              </View>
            )}
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {isGroupMode
                ? `Eventos del grupo${groupName ? ` · ${groupName}` : ''}`
                : `Eventos en el area (${events.length})`
              }
            </Text>
          </View>
          {onFilterPress && !isGroupMode && (
            <TouchableOpacity onPress={onFilterPress} style={[styles.filterButton, { backgroundColor: theme.glass.bg }]}>
              <Ionicons name="options-outline" size={18} color={theme.textSecondary} />
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
        scrollEnabled={feedState === 'expanded'}
        showsVerticalScrollIndicator={feedState === 'expanded'}
        style={{ flex: 1, display: feedState === 'minimized' ? 'none' : 'flex' }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyStateCard, { backgroundColor: theme.surface }]}>
              <AnimatedEmptyIllustration isGroupMode={isGroupMode} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {isGroupMode ? 'Sin eventos en el grupo' : 'Todo tranquilo por aqui'}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {isGroupMode
                  ? 'Se el primero en reportar algo importante para tu grupo'
                  : 'No hay eventos reportados en esta zona. Ayuda a tu comunidad reportando incidentes.'
                }
              </Text>
              <View style={[styles.emptyHint, { backgroundColor: theme.primary.subtle }]}>
                <Ionicons name="add-circle-outline" size={16} color={theme.primary.main} />
                <Text style={[styles.emptyHintText, { color: theme.primary.main }]}>
                  Toca + en Eventos para crear uno
                </Text>
              </View>
            </View>
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
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 6,
    paddingBottom: 8,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    zIndex: 1,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  groupIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
  filterButton: {
    padding: 10,
    borderRadius: radius.md,
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    // Gradient effect using multiple layers would be better with LinearGradient
  },
  timeBadgeOnImage: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeOnImage: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    flexShrink: 1,
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
  statusBadgeClosed: {
    // Colors applied dynamically
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
  emptyState: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyStateCard: {
    padding: 24,
    borderRadius: radius.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: '100%',
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
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
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
  interactionCountActive: {
    // Colors applied dynamically
  },
  urgentCard: {
    // Styles applied dynamically
  },
  closedStaticDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: staticColors.error.main,
  },
});
