import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { LocalMediaItem } from './MediaPicker';

// Re-export the type with thumbnailUri for convenience
export type { LocalMediaItem };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 48 - 24) / 3; // 3 columns with padding and gaps
const ITEM_MARGIN = 8;

interface MediaEditorProps {
  media: LocalMediaItem[];
  onMediaChange: (media: LocalMediaItem[]) => void;
  onAddMore: () => void;
  maxItems?: number;
  disabled?: boolean;
}

interface DraggableMediaItemProps {
  item: LocalMediaItem;
  index: number;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  isDragging: boolean;
  draggedIndex: number | null;
  positions: { x: number; y: number }[];
  disabled: boolean;
}

function DraggableMediaItem({
  item,
  index,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging,
  draggedIndex,
  positions,
  disabled,
}: DraggableMediaItemProps) {
  const { theme, isDark } = useTheme();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);

  const isCurrentDragging = draggedIndex === index;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // For videos, use thumbnail if available, otherwise show a placeholder
  const displayUri = item.type === 'VIDEO' && item.thumbnailUri ? item.thumbnailUri : item.uri;

  const findNewIndexAndEnd = useCallback((translationX: number, translationY: number) => {
    const currentPos = positions[index];
    const newX = currentPos.x + translationX;
    const newY = currentPos.y + translationY;

    // Find closest position
    let closestIndex = index;
    let minDistance = Infinity;

    positions.forEach((pos, i) => {
      const distance = Math.sqrt(
        Math.pow(newX - pos.x, 2) + Math.pow(newY - pos.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    });

    onDragEnd(index, closestIndex);
  }, [index, positions, onDragEnd]);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      scale.value = withSpring(1.1);
      zIndex.value = 100;
      runOnJS(onDragStart)(index);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      zIndex.value = 0;

      runOnJS(findNewIndexAndEnd)(event.translationX, event.translationY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
    opacity: isDragging && !isCurrentDragging ? 0.5 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.mediaItem, animatedStyle]}>
        <View
          style={[
            styles.mediaItemInner,
            { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' },
          ]}
        >
          {/* Use thumbnail for videos, original URI for images */}
          {item.type === 'VIDEO' && !item.thumbnailUri ? (
            // Video without thumbnail - show placeholder
            <View style={[styles.mediaImage, styles.videoPlaceholder, { backgroundColor: isDark ? '#1C1C1E' : '#e0e0e0' }]}>
              <Ionicons name="videocam" size={32} color={isDark ? '#8E8E93' : '#999'} />
            </View>
          ) : (
            <Image
              source={{ uri: displayUri }}
              style={styles.mediaImage}
              contentFit="cover"
            />
          )}

          {/* Video duration badge */}
          {item.type === 'VIDEO' && (
            <View style={styles.durationBadge}>
              <Ionicons name="videocam" size={10} color="#fff" />
              <Text style={styles.durationText}>
                {formatDuration(item.duration || 0)}
              </Text>
            </View>
          )}

          {/* Order badge */}
          <View style={[styles.orderBadge, { backgroundColor: theme.primary.main }]}>
            <Text style={styles.orderText}>{index + 1}</Text>
          </View>

          {/* Remove button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(index)}
            disabled={disabled}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={14} color="#fff" />
          </TouchableOpacity>

          {/* Drag handle indicator */}
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-three" size={16} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function MediaEditor({
  media,
  onMediaChange,
  onAddMore,
  maxItems = 5,
  disabled = false,
}: MediaEditorProps) {
  const { theme, isDark } = useTheme();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const canAddMore = media.length < maxItems;

  // Calculate positions for each item in the grid
  const positions = media.map((_, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      x: col * (ITEM_SIZE + ITEM_MARGIN),
      y: row * (ITEM_SIZE + ITEM_MARGIN),
    };
  });

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback((fromIndex: number, toIndex: number) => {
    setDraggedIndex(null);

    if (fromIndex === toIndex) return;

    // Reorder the array
    const newMedia = [...media];
    const [movedItem] = newMedia.splice(fromIndex, 1);
    newMedia.splice(toIndex, 0, movedItem);
    onMediaChange(newMedia);
  }, [media, onMediaChange]);

  const handleRemove = useCallback((index: number) => {
    Alert.alert(
      'Eliminar',
      '¿Seguro que quieres eliminar este archivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const newMedia = media.filter((_, i) => i !== index);
            onMediaChange(newMedia);
          },
        },
      ]
    );
  }, [media, onMediaChange]);

  if (media.length === 0) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.emptyState,
            {
              backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5',
              borderColor: theme.border,
            },
          ]}
          onPress={onAddMore}
          disabled={disabled}
        >
          <Ionicons name="images-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Agregar fotos y videos
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
            Máximo {maxItems} archivos
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>
          Fotos y videos
        </Text>
        <Text style={[styles.counter, { color: theme.textSecondary }]}>
          {media.length}/{maxItems}
        </Text>
      </View>

      {/* Hint */}
      <Text style={[styles.hint, { color: theme.textTertiary }]}>
        Mantén presionado y arrastra para reordenar
      </Text>

      {/* Grid */}
      <View style={styles.grid}>
        {media.map((item, index) => (
          <DraggableMediaItem
            key={`${item.uri}-${index}`}
            item={item}
            index={index}
            onRemove={handleRemove}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isDragging={draggedIndex !== null}
            draggedIndex={draggedIndex}
            positions={positions}
            disabled={disabled}
          />
        ))}

        {/* Add more button */}
        {canAddMore && (
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5',
                borderColor: theme.border,
              },
              disabled && styles.addButtonDisabled,
            ]}
            onPress={onAddMore}
            disabled={disabled}
          >
            <Ionicons name="add" size={28} color={theme.primary.main} />
          </TouchableOpacity>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  counter: {
    fontSize: 13,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ITEM_MARGIN,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  mediaItemInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  orderBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
});

export default MediaEditor;
