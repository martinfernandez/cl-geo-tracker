import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  label?: string;
  style?: ViewStyle;
  backgroundColor?: string;
}

export default function FloatingActionButton({
  onPress,
  icon = '+',
  label,
  style,
  backgroundColor = '#007AFF',
}: FloatingActionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        { backgroundColor },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {label ? (
        <Text style={styles.fabLabel}>{label}</Text>
      ) : (
        <Text style={styles.fabIcon}>{icon}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  fabLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
