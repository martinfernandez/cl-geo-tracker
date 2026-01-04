import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { foundChatsApi, FoundObjectChat } from '../services/api';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';

// Animated status dot component
const StatusDot = ({ status, color }: { status: string; color: string }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (status === 'ACTIVE') {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.4,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [status]);

  return (
    <View style={styles.statusDotContainer}>
      {status === 'ACTIVE' && (
        <Animated.View
          style={[
            styles.statusDotPulse,
            {
              backgroundColor: color,
              opacity: opacityAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}
      <View style={[styles.statusDotInner, { backgroundColor: color }]} />
    </View>
  );
};

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Activo',
    color: '#34C759',
  },
  RESOLVED: {
    label: 'Recuperado',
    color: '#007AFF',
  },
  CLOSED: {
    label: 'Cerrado',
    color: '#8E8E93',
  },
};

// Get initials from name (1-2 characters)
const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export function FoundChatsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [chats, setChats] = useState<FoundObjectChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'RESOLVED' | 'CLOSED'>('all');

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadChats();
    });
    return unsubscribe;
  }, [navigation]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const data = await foundChatsApi.getOwnerChats();
      setChats(data);
    } catch (error) {
      console.error('Error loading found chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const handleChatPress = (chat: FoundObjectChat) => {
    navigation.navigate('FoundChat' as never, { chatId: chat.id } as never);
  };

  const filteredChats = filter === 'all'
    ? chats
    : chats.filter(chat => chat.status === filter);

  const renderChat = ({ item }: { item: FoundObjectChat }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const timeAgo = formatDistanceToNow(new Date(item.lastMessageAt || item.createdAt), {
      addSuffix: false,
      locale: es,
    });

    const finderDisplay = item.finderName || 'Alguien';
    const deviceName = item.device?.name || 'Objeto';
    const hasUnread = item.unreadCount && item.unreadCount > 0;
    const initials = getInitials(finderDisplay);

    return (
      <TouchableOpacity
        style={[
          styles.chatCard,
          {
            backgroundColor: hasUnread ? theme.primary.subtle : theme.bg.primary,
            borderBottomColor: theme.glass.border,
          },
        ]}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar with initials and status dot */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: '#FF9500' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <StatusDot status={item.status} color={statusConfig.color} />
        </View>

        {/* Chat info - device name as title, last message below */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text
              style={[
                styles.deviceTitle,
                { color: theme.text.primary },
                hasUnread && styles.deviceTitleUnread
              ]}
              numberOfLines={1}
            >
              {deviceName}
            </Text>
            <Text style={[styles.timeAgo, { color: hasUnread ? theme.primary.main : theme.text.tertiary }]}>
              {timeAgo}
            </Text>
          </View>

          {item.lastMessage && (
            <Text
              style={[
                styles.lastMessage,
                { color: hasUnread ? theme.text.primary : theme.text.secondary },
                hasUnread && styles.lastMessageUnread
              ]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          )}
        </View>

        {/* Right side - unread badge */}
        {hasUnread && (
          <View style={styles.chatRight}>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount! > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ value, label }: { value: typeof filter; label: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor: filter === value ? theme.primary.main : theme.bg.primary,
          borderColor: filter === value ? theme.primary.main : theme.glass.border,
        }
      ]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterButtonText,
        { color: filter === value ? '#fff' : theme.text.secondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg.secondary }]}>
        <ScreenHeader
          title="Objetos Encontrados"
          subtitle={`${chats.length} chats`}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.secondary }]}>
      <ScreenHeader
        title="Objetos Encontrados"
        subtitle={`${chats.length} ${chats.length === 1 ? 'chat' : 'chats'}`}
      />

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.bg.primary }]}>
        <FilterButton value="all" label="Todos" />
        <FilterButton value="ACTIVE" label="Activos" />
        <FilterButton value="RESOLVED" label="Recuperados" />
      </View>

      <FlatList
        data={filteredChats}
        renderItem={renderChat}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary.main}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.glass.bg }]}>
              <Ionicons name="search-outline" size={48} color={theme.text.tertiary} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: theme.text.primary }]}>
              {filter === 'all'
                ? 'No hay chats de objetos encontrados'
                : `No hay chats ${STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG]?.label.toLowerCase()}`}
            </Text>
            <Text style={[styles.emptyStateMessage, { color: theme.text.secondary }]}>
              Cuando alguien escanee el QR de tus objetos, los chats apareceran aqui
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  statusDotContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotPulse: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  deviceTitleUnread: {
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
  },
  lastMessageUnread: {
    fontWeight: '500',
  },
  chatRight: {
    marginLeft: 8,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
