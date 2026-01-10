import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../contexts/ThemeContext';

interface PeekLogoProps {
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showBubble?: boolean;
  variant?: 'default' | 'white' | 'dark';
  isPeeking?: boolean;
}

const sizeConfig = {
  small: { fontSize: 22, height: 44, paddingH: 12, badgeFontSize: 10, logoSize: 28 },
  medium: { fontSize: 28, height: 52, paddingH: 16, badgeFontSize: 11, logoSize: 36 },
  large: { fontSize: 36, height: 64, paddingH: 20, badgeFontSize: 12, logoSize: 48 },
};

export function PeekLogo({
  size = 'medium',
  onPress,
  showBubble = true,
  variant: variantProp,
  isPeeking = false,
}: PeekLogoProps) {
  const { isDark } = useTheme();
  const config = sizeConfig[size];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Auto-detect variant based on dark mode if not explicitly provided
  const variant = variantProp ?? (isDark ? 'white' : 'default');

  // Pulse animation for the badge - like an antenna transmitting
  useEffect(() => {
    if (isPeeking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
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

  const variantColors = {
    default: {
      accent: '#1a1a1a',
      text: '#1a1a1a',
      bubble: colors.neutral[0],
      shadow: '#000',
      badge: colors.success.main,
    },
    white: {
      accent: '#FFFFFF',
      text: 'rgba(255,255,255,0.85)',
      bubble: 'rgba(255,255,255,0.15)',
      shadow: 'transparent',
      badge: colors.success.light,
    },
    dark: {
      accent: colors.primary.light,
      text: colors.neutral[300],
      bubble: colors.neutral[900],
      shadow: '#000',
      badge: colors.success.main,
    },
  };

  const c = variantColors[variant];

  // Hide icon for 'white' variant since icon.png has non-transparent background
  const showIcon = variant !== 'white';

  const LogoContent = (
    <View style={styles.logoWrapper}>
      {showIcon && (
        <Image
          source={require('../../assets/icon.png')}
          style={[styles.logoImage, { width: config.logoSize, height: config.logoSize }]}
        />
      )}
      <Text style={[styles.logoText, { fontSize: config.fontSize }]}>
        <Text style={[styles.accentLetter, { color: c.accent }]}>P</Text>
        <Text style={[styles.normalLetter, { color: c.text }]}>ee</Text>
        <Text style={[styles.accentLetter, { color: c.accent }]}>K</Text>
      </Text>
    </View>
  );

  if (!showBubble) {
    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {LogoContent}
        </TouchableOpacity>
      );
    }
    return LogoContent;
  }

  const content = (
    <View
      style={[
        styles.bubble,
        {
          height: config.height,
          paddingHorizontal: config.paddingH,
          backgroundColor: c.bubble,
          shadowColor: c.shadow,
        },
      ]}
    >
      {LogoContent}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  logoWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    letterSpacing: -1,
  },
  logoImage: {
    marginRight: 6,
    borderRadius: 6,
  },
  accentLetter: {
    fontWeight: '800',
  },
  normalLetter: {
    fontWeight: '500',
  },
  peekingBadge: {
    position: 'absolute',
    top: -8,
    right: -22,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  peekingBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  bubble: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
