import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, ActivityIndicator, ViewStyle, Animated } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { BASE_URL } from '../config/environment';

interface VideoPlayerProps {
  uri: string;
  thumbnailUri?: string;
  style?: ViewStyle;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  isVisible?: boolean; // For auto-pause when scrolled out of view
}

export function VideoPlayer({
  uri,
  thumbnailUri,
  style,
  autoPlay = true, // Instagram: autoplay by default
  muted = true,
  loop = true,
  showControls = true,
  onPlaybackStatusUpdate,
  isVisible = true,
}: VideoPlayerProps) {
  const { theme, isDark } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(muted);
  const [error, setError] = useState(false);

  // Instagram-style feedback animations
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;
  const pauseIconScale = useRef(new Animated.Value(0.5)).current;
  const muteIconOpacity = useRef(new Animated.Value(0)).current;

  // Show mute indicator when first appearing if muted
  const [showMuteIndicator, setShowMuteIndicator] = useState(muted);

  // Construct full URL if needed
  const isLocalFile = uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('assets-library://');
  const videoUrl = uri.startsWith('http') || isLocalFile ? uri : `${BASE_URL}${uri}`;
  const thumbnailUrl = thumbnailUri
    ? (thumbnailUri.startsWith('http') || thumbnailUri.startsWith('file://') ? thumbnailUri : `${BASE_URL}${thumbnailUri}`)
    : undefined;

  // Auto-pause when not visible
  useEffect(() => {
    if (!isVisible && isPlaying) {
      videoRef.current?.pauseAsync();
    }
    // Auto-play when visible (Instagram style)
    if (isVisible && autoPlay && !error) {
      videoRef.current?.playAsync();
    }
  }, [isVisible, autoPlay, error]);

  // Hide mute indicator after 2 seconds
  useEffect(() => {
    if (showMuteIndicator) {
      const timer = setTimeout(() => {
        Animated.timing(muteIconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowMuteIndicator(false));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showMuteIndicator]);

  // Animate mute indicator on mount
  useEffect(() => {
    if (showMuteIndicator) {
      Animated.timing(muteIconOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setIsLoading(false);
    }
    onPlaybackStatusUpdate?.(status);
  }, [onPlaybackStatusUpdate]);

  // Instagram-style tap: single tap to pause/play with animated feedback
  const handleTap = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
      // Show pause icon animation
      showPauseAnimation();
    } else {
      await videoRef.current.playAsync();
      // Show play icon briefly
      showPlayAnimation();
    }
  };

  // Show pause animation (Instagram style)
  const showPauseAnimation = () => {
    pauseIconOpacity.setValue(1);
    pauseIconScale.setValue(0.5);

    Animated.parallel([
      Animated.sequence([
        Animated.spring(pauseIconScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(pauseIconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // Show play animation
  const showPlayAnimation = () => {
    pauseIconOpacity.setValue(1);
    pauseIconScale.setValue(0.5);

    Animated.parallel([
      Animated.spring(pauseIconScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(pauseIconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // Toggle mute with visual feedback
  const handleMuteToggle = async () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await videoRef.current.setIsMutedAsync(newMuted);

    // Show mute indicator briefly
    setShowMuteIndicator(true);
    muteIconOpacity.setValue(1);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}>
        <Ionicons name="videocam-off-outline" size={40} color={theme.textTertiary} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={[styles.container, style]}>
        {/* Thumbnail shown while loading */}
        {isLoading && thumbnailUrl && (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        )}

        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isVisible && autoPlay}
          isLooping={loop}
          isMuted={isMuted}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={handleError}
          useNativeControls={false}
        />

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Instagram-style center pause/play icon feedback */}
        <Animated.View
          style={[
            styles.centerIconContainer,
            {
              opacity: pauseIconOpacity,
              transform: [{ scale: pauseIconScale }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.centerIcon}>
            <Ionicons
              name={isPlaying ? 'play' : 'pause'}
              size={50}
              color="#fff"
              style={isPlaying ? { marginLeft: 4 } : undefined}
            />
          </View>
        </Animated.View>

        {/* Instagram-style mute indicator (bottom right) */}
        {showControls && (
          <TouchableWithoutFeedback onPress={handleMuteToggle}>
            <View style={styles.muteButtonContainer}>
              <Animated.View
                style={[
                  styles.muteButton,
                  showMuteIndicator && { opacity: muteIconOpacity },
                  !showMuteIndicator && styles.muteButtonPersistent,
                ]}
              >
                <Ionicons
                  name={isMuted ? 'volume-mute' : 'volume-high'}
                  size={16}
                  color="#fff"
                />
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Paused state indicator (when video is paused, show subtle play button) */}
        {!isPlaying && !isLoading && (
          <View style={styles.pausedOverlay} pointerEvents="none">
            <View style={styles.pausedIcon}>
              <Ionicons name="play" size={40} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  centerIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButtonContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 5,
  },
  muteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButtonPersistent: {
    opacity: 0.8,
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 3,
  },
  pausedIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VideoPlayer;
