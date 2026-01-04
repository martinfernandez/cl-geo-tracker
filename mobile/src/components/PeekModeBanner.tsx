import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface PeekModeBannerProps {
  isPeeking: boolean;
  onPress: () => void;
}

export function PeekModeBanner({ isPeeking, onPress }: PeekModeBannerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulse animation when active
  useEffect(() => {
    if (isPeeking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPeeking]);

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        isPeeking ? styles.bannerActive : styles.bannerInactive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.content,
          isPeeking && { opacity: pulseAnim },
        ]}
      >
        <Ionicons
          name={isPeeking ? 'eye' : 'eye-off-outline'}
          size={16}
          color={isPeeking ? colors.success.dark : '#8B4513'}
        />
        <Text
          style={[
            styles.text,
            isPeeking ? styles.textActive : styles.textInactive,
          ]}
        >
          {isPeeking ? 'PeeKing...' : 'Echar un vistazo'}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={isPeeking ? colors.success.dark : '#8B4513'}
          style={styles.chevron}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  bannerInactive: {
    backgroundColor: 'rgba(139, 69, 19, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.15)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  textActive: {
    color: colors.success.dark,
  },
  textInactive: {
    color: '#8B4513',
  },
  chevron: {
    marginLeft: 2,
  },
});
