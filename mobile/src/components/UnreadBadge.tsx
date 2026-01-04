import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  count: number;
  size?: 'small' | 'medium';
}

export default function UnreadBadge({ count, size = 'medium' }: Props) {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, isSmall && styles.badgeSmall]}>
      <Text style={[styles.badgeText, isSmall && styles.badgeTextSmall]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeSmall: {
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextSmall: {
    fontSize: 10,
  },
});
