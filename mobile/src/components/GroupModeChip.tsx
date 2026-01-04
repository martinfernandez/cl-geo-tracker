import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Group } from '../services/api';

interface GroupModeChipProps {
  group: Group;
  onClose: () => void;
  onPress?: () => void;
  memberCount?: number;
}

export default function GroupModeChip({ group, onClose, onPress, memberCount }: GroupModeChipProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="people" size={16} color="#007AFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text} numberOfLines={1}>
          {group.name}
        </Text>
        {memberCount !== undefined && memberCount > 0 && (
          <Text style={styles.memberCount}>
            {memberCount} en linea
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={(e) => {
          e.stopPropagation();
          onClose();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={20} color="#8E8E93" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: 220,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
    marginRight: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  memberCount: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 1,
  },
  closeButton: {
    padding: 4,
  },
});
