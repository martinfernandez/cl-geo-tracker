import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface UserAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  size?: number;
  backgroundColor?: string;
}

export default function UserAvatar({
  imageUrl,
  name,
  size = 40,
  backgroundColor,
}: UserAvatarProps) {
  const { theme } = useTheme();
  const initial = (name || '?').charAt(0).toUpperCase();
  const bgColor = backgroundColor || theme.primary.main;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textSize = size * 0.45;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, containerStyle]}
      />
    );
  }

  return (
    <View style={[styles.container, containerStyle, { backgroundColor: bgColor }]}>
      <Text style={[styles.initial, { fontSize: textSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  initial: {
    color: '#fff',
    fontWeight: '600',
  },
});
