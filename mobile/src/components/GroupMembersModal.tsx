import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GroupPosition {
  type: 'JX10' | 'PHONE';
  deviceId: string;
  deviceName: string;
  memberId: string;
  memberName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
}

interface GroupMembersModalProps {
  visible: boolean;
  onClose: () => void;
  positions: GroupPosition[];
  onSelectMember: (position: GroupPosition) => void;
  groupName: string;
}

export default function GroupMembersModal({
  visible,
  onClose,
  positions,
  onSelectMember,
  groupName,
}: GroupMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Group positions by member and filter by search
  const groupedMembers = useMemo(() => {
    const memberMap = new Map<string, GroupPosition[]>();

    positions.forEach((pos) => {
      const existing = memberMap.get(pos.memberId) || [];
      existing.push(pos);
      memberMap.set(pos.memberId, existing);
    });

    const members = Array.from(memberMap.entries()).map(([memberId, memberPositions]) => ({
      memberId,
      memberName: memberPositions[0].memberName,
      positions: memberPositions,
    }));

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return members.filter((m) => m.memberName.toLowerCase().includes(query));
    }

    return members;
  }, [positions, searchQuery]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;

    return date.toLocaleDateString('es');
  };

  const renderMemberItem = ({ item }: { item: { memberId: string; memberName: string; positions: GroupPosition[] } }) => {
    const initial = item.memberName?.charAt(0)?.toUpperCase() || '?';
    const latestPosition = item.positions.reduce((latest, pos) => {
      return new Date(pos.timestamp) > new Date(latest.timestamp) ? pos : latest;
    }, item.positions[0]);

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => {
          onSelectMember(latestPosition);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.memberAvatar}>
          <Text style={styles.memberInitial}>{initial}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.memberName}</Text>
          <View style={styles.memberMeta}>
            <View style={styles.deviceBadge}>
              <Ionicons
                name={latestPosition.type === 'PHONE' ? 'phone-portrait' : 'hardware-chip'}
                size={12}
                color="#8E8E93"
              />
              <Text style={styles.deviceText}>
                {latestPosition.type === 'PHONE' ? 'Telefono' : latestPosition.deviceName}
              </Text>
            </View>
            <Text style={styles.timeText}>{formatTime(latestPosition.timestamp)}</Text>
          </View>
        </View>
        <Ionicons name="locate-outline" size={24} color="#007AFF" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{groupName}</Text>
            <Text style={styles.subtitle}>
              {positions.length > 0
                ? `${groupedMembers.length} miembro${groupedMembers.length !== 1 ? 's' : ''} compartiendo`
                : 'Ningun miembro compartiendo ubicacion'}
            </Text>
          </View>

          {/* Search */}
          {positions.length > 0 && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar miembro..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Members List */}
          {positions.length > 0 ? (
            <FlatList
              data={groupedMembers}
              renderItem={renderMemberItem}
              keyExtractor={(item) => item.memberId}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                searchQuery.length > 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No se encontraron miembros</Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>Sin ubicaciones</Text>
              <Text style={styles.emptyText}>
                Los miembros deben activar "Compartir ubicacion" en el grupo para aparecer aqui
              </Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  handleBar: {
    width: 36,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
    padding: 0,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#262626',
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  deviceText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  closeButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
