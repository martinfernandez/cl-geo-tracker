import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Image as RNImage,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import { Image, ImageSource, ImageContentFit } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonImageProps {
  source: ImageSource;
  style?: ImageStyle;
  contentFit?: ImageContentFit;
  transition?: number;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
}

export function SkeletonImage({
  source,
  style,
  contentFit = 'cover',
  transition = 200,
  cachePolicy = 'memory-disk',
}: SkeletonImageProps) {
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (isLoading || hasError) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLoading, hasError, pulseAnim]);

  const containerStyle: ViewStyle = {
    width: (style as any)?.width || '100%',
    height: (style as any)?.height || 180,
  };

  const skeletonBgColor = isDark ? '#2C2C2E' : '#F2F2F7';
  const iconColor = isDark ? '#48484A' : '#C7C7CC';

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Skeleton placeholder - visible while loading or on error */}
      {(isLoading || hasError) && (
        <Animated.View
          style={[
            styles.skeleton,
            containerStyle,
            {
              opacity: pulseAnim,
              backgroundColor: skeletonBgColor,
            },
          ]}
        >
          {/* Simple icon placeholder */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={hasError ? "image-outline" : "image"}
              size={40}
              color={iconColor}
            />
          </View>
        </Animated.View>
      )}

      {/* Actual image */}
      <Image
        source={source}
        style={[style, styles.image]}
        contentFit={contentFit}
        transition={transition}
        cachePolicy={cachePolicy}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
