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
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isLoading || hasError) {
      // Subtle pulse animation for the logo
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      // Glow animation for the background
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      glow.start();

      return () => {
        pulse.stop();
        glow.stop();
      };
    }
  }, [isLoading, hasError, pulseAnim, glowAnim]);

  const containerStyle: ViewStyle = {
    width: (style as any)?.width || '100%',
    height: (style as any)?.height || 180,
  };

  // Colors for dark and light modes
  const bgColor = isDark ? '#1C1C1E' : '#F2F2F7';
  const gradientColor = isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)';

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Skeleton placeholder - visible while loading or on error */}
      {(isLoading || hasError) && (
        <View
          style={[
            styles.skeleton,
            containerStyle,
            { backgroundColor: bgColor },
          ]}
        >
          {/* Subtle gradient glow effect */}
          <Animated.View
            style={[
              styles.glowEffect,
              {
                backgroundColor: gradientColor,
                opacity: glowAnim,
              },
            ]}
          />

          {/* App logo centered with subtle animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              { opacity: pulseAnim },
            ]}
          >
            <RNImage
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
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
  glowEffect: {
    position: 'absolute',
    top: '25%',
    left: '25%',
    right: '25%',
    bottom: '25%',
    borderRadius: 100,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
