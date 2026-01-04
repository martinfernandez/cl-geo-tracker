import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

interface UrgentPulsingDotProps {
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

const SIZE_CONFIG = {
  small: { container: 14, pulse: 8, dot: 6 },
  medium: { container: 20, pulse: 12, dot: 8 },
  large: { container: 24, pulse: 16, dot: 10 },
};

export const UrgentPulsingDot = ({ color = '#DC2626', size = 'medium' }: UrgentPulsingDotProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const config = SIZE_CONFIG[size];

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
    <View style={[styles.container, { width: config.container, height: config.container }]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: color,
            width: config.pulse,
            height: config.pulse,
            borderRadius: config.pulse / 2,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: config.dot,
            height: config.dot,
            borderRadius: config.dot / 2,
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
  },
  dot: {},
});

export default UrgentPulsingDot;
