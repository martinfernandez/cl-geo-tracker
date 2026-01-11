import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { VideoPlayer } from './VideoPlayer';
import { SkeletonImage } from './SkeletonImage';
import { BASE_URL } from '../config/environment';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string | null;
  order: number;
  duration?: number | null;
}

interface MediaCarouselProps {
  media: MediaItem[];
  style?: ViewStyle;
  height?: number;
  onMediaPress?: (index: number) => void;
  showIndicators?: boolean;
  autoPlayVideos?: boolean;
  compact?: boolean; // For feed cards (smaller size)
}

export function MediaCarousel({
  media,
  style,
  height = 300,
  onMediaPress,
  showIndicators = true,
  autoPlayVideos = false,
  compact = false,
}: MediaCarouselProps) {
  const { theme, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(compact ? SCREEN_WIDTH : SCREEN_WIDTH);
  const flatListRef = useRef<FlatList>(null);

  // For compact mode, measure the actual container width
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  }, [containerWidth]);

  const itemWidth = compact ? containerWidth : SCREEN_WIDTH;

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffset / itemWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < media.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, itemWidth, media.length]);

  const handleMediaPress = useCallback((index: number) => {
    onMediaPress?.(index);
  }, [onMediaPress]);

  const renderMediaItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => {
    const isVisible = index === currentIndex;

    // Handle local file URIs (file://) for previews, and relative paths from server
    const isLocalUri = item.url.startsWith('file://') || item.url.startsWith('ph://') || item.url.startsWith('assets-library://');
    const imageUrl = item.url.startsWith('http') || isLocalUri ? item.url : `${BASE_URL}${item.url}`;
    const thumbnailUrl = item.thumbnailUrl
      ? (item.thumbnailUrl.startsWith('http') || item.thumbnailUrl.startsWith('file://') ? item.thumbnailUrl : `${BASE_URL}${item.thumbnailUrl}`)
      : undefined;

    if (item.type === 'VIDEO') {
      return (
        <View style={[styles.mediaItem, { width: itemWidth, height }]}>
          <VideoPlayer
            uri={item.url}
            thumbnailUri={thumbnailUrl}
            style={{ width: '100%', height: '100%' }}
            autoPlay={autoPlayVideos && isVisible}
            muted={true}
            loop={true}
            showControls={!compact}
            isVisible={isVisible}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.mediaItem, { width: itemWidth, height }]}
        onPress={() => handleMediaPress(index)}
        activeOpacity={onMediaPress ? 0.9 : 1}
      >
        <SkeletonImage
          source={{ uri: imageUrl }}
          style={{ width: itemWidth, height }}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    );
  }, [currentIndex, itemWidth, height, autoPlayVideos, compact, handleMediaPress, onMediaPress]);

  // Single media item - no carousel needed
  if (media.length === 1) {
    const item = media[0];
    // Handle local file URIs (file://) for previews, and relative paths from server
    const isLocalUri = item.url.startsWith('file://') || item.url.startsWith('ph://') || item.url.startsWith('assets-library://');
    const imageUrl = item.url.startsWith('http') || isLocalUri ? item.url : `${BASE_URL}${item.url}`;
    const thumbnailUrl = item.thumbnailUrl
      ? (item.thumbnailUrl.startsWith('http') || item.thumbnailUrl.startsWith('file://') ? item.thumbnailUrl : `${BASE_URL}${item.thumbnailUrl}`)
      : undefined;

    if (item.type === 'VIDEO') {
      return (
        <View style={[styles.container, style, { height }]}>
          <VideoPlayer
            uri={item.url}
            thumbnailUri={thumbnailUrl}
            style={{ width: '100%', height: '100%' }}
            autoPlay={autoPlayVideos}
            muted={true}
            loop={true}
            showControls={!compact}
            isVisible={true}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.container, style, { height }]}
        onPress={() => handleMediaPress(0)}
        activeOpacity={onMediaPress ? 0.9 : 1}
      >
        <SkeletonImage
          source={{ uri: imageUrl }}
          style={{ width: '100%', height }}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]} onLayout={compact ? handleLayout : undefined}>
      <FlatList
        ref={flatListRef}
        data={media}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={itemWidth}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
      />

      {/* Dot indicators */}
      {showIndicators && media.length > 1 && (
        <View style={styles.indicatorContainer}>
          {media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor: index === currentIndex
                    ? '#fff'
                    : 'rgba(255, 255, 255, 0.5)',
                  width: index === currentIndex ? 8 : 6,
                  height: index === currentIndex ? 8 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Media count badge (Instagram style) */}
      {media.length > 1 && (
        <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.6)' }]}>
          <View style={styles.countBadgeInner}>
            {media.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.countDot,
                  index === currentIndex && styles.countDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  mediaItem: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  countBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  countDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default MediaCarousel;
