import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Easing,
  TextInput,
  Keyboard,
  Image,
} from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { api, foundChatsApi, FoundObjectChat } from '../services/api';
import { ObjectsPatternBackground } from '../components/ObjectsPatternBackground';
import { FadeInView } from '../components/FadeInView';
import UnreadBadge from '../components/UnreadBadge';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import UserAvatar from '../components/UserAvatar';
import { colors, radius } from '../theme/colors';
import Svg, { Circle, Path, G } from 'react-native-svg';

type TabType = 'messages' | 'found';

// Animated status dot component for found objects
const FoundStatusDot = ({ status, color, isDark }: { status: string; color: string; isDark?: boolean }) => {
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
    <View style={foundDotStyles.container}>
      {status === 'ACTIVE' && (
        <Animated.View
          style={[
            foundDotStyles.pulse,
            {
              backgroundColor: color,
              opacity: opacityAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}
      <View style={[foundDotStyles.inner, { backgroundColor: color, borderColor: isDark ? '#1C1C1E' : '#fff' }]} />
    </View>
  );
};

const foundDotStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  inner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

const DELETE_BUTTON_WIDTH = 80;
const ROW_HEIGHT = 64;

interface ConversationPreview {
  id: string;
  eventId?: string;
  event?: {
    type: 'THEFT' | 'LOST' | 'ACCIDENT' | 'FIRE' | 'OTHER';
    description: string;
    isUrgent: boolean;
  };
  isGroupChat?: boolean;
  groupId?: string;
  group?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  otherUser?: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      name: string;
    };
  };
  unreadCount: number;
  lastMessageAt: string;
}

const EVENT_ICONS = {
  THEFT: 'warning',
  LOST: 'search',
  ACCIDENT: 'medical',
  FIRE: 'flame',
  OTHER: 'alert-circle',
};

const EVENT_COLORS = {
  THEFT: '#FF3B30',
  LOST: '#FF9500',
  ACCIDENT: '#FF2D55',
  FIRE: '#FF3B30',
  OTHER: '#8E8E93',
};

// Animated empty state illustration
const AnimatedEmptyIllustration = ({ isDark }: { isDark: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Theme-aware colors for the SVG
  const outerCircleFill = isDark ? '#2C2C2E' : '#F0F4FF';
  const dashedCircleStroke = isDark ? '#3A3A3C' : '#E0E7FF';

  return (
    <View style={emptyStyles.illustrationContainer}>
      <Animated.View
        style={[
          emptyStyles.illustrationWrapper,
          {
            transform: [{ scale: pulseAnim }, { translateY: floatAnim }],
          },
        ]}
      >
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r="55" fill={outerCircleFill} />
          <Circle cx="60" cy="60" r="45" fill="none" stroke={dashedCircleStroke} strokeWidth="1" strokeDasharray="4 4" />
          <Circle cx="60" cy="60" r="35" fill="none" stroke={dashedCircleStroke} strokeWidth="1" strokeDasharray="4 4" />
          <G>
            {/* Chat bubbles */}
            <Path
              d="M40 45 L40 70 Q40 75 45 75 L55 75 L60 82 L65 75 L75 75 Q80 75 80 70 L80 45 Q80 40 75 40 L45 40 Q40 40 40 45 Z"
              fill={colors.primary.main}
            />
            <Circle cx="52" cy="57" r="4" fill="#fff" />
            <Circle cx="60" cy="57" r="4" fill="#fff" />
            <Circle cx="68" cy="57" r="4" fill="#fff" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

const emptyStyles = StyleSheet.create({
  illustrationContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustrationWrapper: {
    position: 'absolute',
  },
});

// Swipeable conversation item
interface SwipeableConversationProps {
  item: ConversationPreview;
  onPress: () => void;
  onDelete: () => void;
  onLeaveGroup?: () => void;
  theme: any;
  isDark: boolean;
}

const SwipeableConversation = ({ item, onPress, onDelete, onLeaveGroup, theme, isDark }: SwipeableConversationProps) => {
  const swipeableRef = useRef<Swipeable>(null);

  const hasUnread = item.unreadCount > 0;
  const isGroup = item.isGroupChat;

  let timeAgo = '';
  if (item.lastMessageAt) {
    timeAgo = formatDistanceToNow(new Date(item.lastMessageAt), {
      addSuffix: false,
      locale: es,
    });
  }

  const lastMessageText = item.lastMessage
    ? isGroup && item.lastMessage.sender
      ? `${item.lastMessage.sender.name}: ${item.lastMessage.content}`
      : item.lastMessage.content
    : null;

  const displayName = isGroup
    ? item.group?.name || 'Chat de Grupo'
    : item.otherUser?.name || 'Usuario';

  const avatarInitial = displayName.charAt(0).toUpperCase();
  const avatarImage = isGroup ? item.group?.imageUrl : item.otherUser?.imageUrl;
  const eventIcon = item.event ? EVENT_ICONS[item.event.type] : null;
  const eventColor = item.event ? EVENT_COLORS[item.event.type] : null;

  const handleDelete = () => {
    Alert.alert(
      'Eliminar conversación',
      '¿Estás seguro de que deseas eliminar esta conversación?',
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Salir del grupo',
      `¿Estás seguro de que deseas salir del grupo "${displayName}"?`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: onLeaveGroup,
        },
      ]
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    // For group chats, show "Leave group" instead of delete
    if (isGroup) {
      return (
        <RectButton style={[styles.deleteAction, { backgroundColor: '#FF9500' }]} onPress={handleLeaveGroup}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="exit-outline" size={22} color="#fff" />
          </Animated.View>
        </RectButton>
      );
    }

    return (
      <RectButton style={[styles.deleteAction, { backgroundColor: theme.error.main }]} onPress={handleDelete}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </Animated.View>
      </RectButton>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[
          styles.conversationCard,
          {
            backgroundColor: hasUnread
              ? (isDark ? 'rgba(88, 86, 214, 0.15)' : 'rgba(88, 86, 214, 0.08)')
              : (isDark ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)'),
            borderBottomColor: theme.glass.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.conversationTouchable}>
          <View style={styles.conversationLeft}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {isGroup ? (
                avatarImage ? (
                  <Image source={{ uri: avatarImage }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: theme.success.main }]}>
                    <Ionicons name="people" size={18} color="#fff" />
                  </View>
                )
              ) : (
                <UserAvatar
                  imageUrl={avatarImage}
                  name={displayName}
                  size={44}
                  backgroundColor={theme.primary.main}
                />
              )}

              {!isGroup && eventIcon && eventColor && (
                <View style={[styles.eventBadge, { backgroundColor: eventColor, borderColor: isDark ? '#1C1C1E' : '#fff' }]}>
                  <Ionicons name={eventIcon as any} size={10} color="#fff" />
                </View>
              )}
            </View>

            {/* Conversation Info */}
            <View style={styles.conversationInfo}>
              <View style={styles.conversationHeader}>
                <Text
                  style={[
                    styles.userName,
                    { color: theme.text },
                    hasUnread && styles.userNameUnread,
                  ]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                {timeAgo && (
                  <Text style={[styles.timeAgo, { color: hasUnread ? theme.primary.main : theme.textTertiary }]}>
                    {timeAgo}
                  </Text>
                )}
              </View>

              {lastMessageText ? (
                <Text
                  style={[
                    styles.lastMessage,
                    { color: hasUnread ? theme.text : theme.textSecondary },
                    hasUnread && styles.lastMessageUnread,
                  ]}
                  numberOfLines={1}
                >
                  {lastMessageText}
                </Text>
              ) : isGroup ? (
                <View style={styles.emptyGroupRow}>
                  <Text style={[styles.emptyGroupText, { color: theme.textTertiary }]}>
                    Sin mensajes aún
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Right side: unread badge or CTA for empty groups */}
          {hasUnread ? (
            <View style={styles.conversationRight}>
              <UnreadBadge count={item.unreadCount} size="small" />
            </View>
          ) : isGroup && !lastMessageText ? (
            <View style={[styles.startChatCta, { backgroundColor: theme.success.subtle }]}>
              <Ionicons name="chatbubble-outline" size={12} color={theme.success.main} />
              <Text style={[styles.startChatText, { color: theme.success.main }]}>Saludar</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

// Status config for found chats
const FOUND_STATUS_CONFIG = {
  ACTIVE: { label: 'Activo', color: '#34C759', bgColor: '#E8F8ED' },
  RESOLVED: { label: 'Recuperado', color: '#007AFF', bgColor: '#E3F2FD' },
  CLOSED: { label: 'Cerrado', color: '#8E8E93', bgColor: '#F2F2F7' },
};

export default function InboxScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [foundChats, setFoundChats] = useState<FoundObjectChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase().trim();
    return conversations.filter((conv) => {
      // Search in user name
      const userName = conv.isGroupChat
        ? conv.group?.name || ''
        : conv.otherUser?.name || '';
      if (userName.toLowerCase().includes(query)) return true;

      // Search in event description
      if (conv.event?.description?.toLowerCase().includes(query)) return true;

      // Search in last message
      if (conv.lastMessage?.content?.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [conversations, searchQuery]);

  // Filter found chats based on search query
  const filteredFoundChats = useMemo(() => {
    if (!searchQuery.trim()) return foundChats;

    const query = searchQuery.toLowerCase().trim();
    return foundChats.filter((chat) => {
      if (chat.finderName?.toLowerCase().includes(query)) return true;
      if (chat.device?.name?.toLowerCase().includes(query)) return true;
      if (chat.lastMessage?.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [foundChats, searchQuery]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      await Promise.all([loadConversations(), loadFoundChats()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadFoundChats = async () => {
    try {
      const data = await foundChatsApi.getOwnerChats();
      setFoundChats(data);
    } catch (error) {
      console.error('Error loading found chats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleFoundChatPress = (chat: FoundObjectChat) => {
    navigation.navigate('FoundChat' as never, { chatId: chat.id } as never);
  };

  const renderFoundChat = ({ item, index }: { item: FoundObjectChat; index: number }) => {
    const statusConfig = FOUND_STATUS_CONFIG[item.status as keyof typeof FOUND_STATUS_CONFIG] || FOUND_STATUS_CONFIG.ACTIVE;
    const timeAgo = formatDistanceToNow(new Date(item.lastMessageAt || item.createdAt), {
      addSuffix: false,
      locale: es,
    });

    const finderName = item.finderName || 'Anónimo';
    const finderInitial = finderName.charAt(0).toUpperCase();
    const hasUnread = (item.unreadCount ?? 0) > 0;

    return (
      <FadeInView delay={index * 40} duration={300} slideFrom={10}>
      <TouchableOpacity
        style={[
          styles.conversationCard,
          {
            backgroundColor: hasUnread
              ? (isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.08)')
              : (isDark ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)'),
            borderBottomColor: theme.glass.border,
          },
        ]}
        onPress={() => handleFoundChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationTouchable}>
          <View style={styles.conversationLeft}>
            <View style={styles.avatarContainer}>
              <UserAvatar
                name={finderName}
                size={44}
                backgroundColor="#FF9500"
              />
              <FoundStatusDot status={item.status} color={statusConfig.color} isDark={isDark} />
            </View>

            <View style={styles.conversationInfo}>
              <View style={styles.conversationHeader}>
                <Text
                  style={[
                    styles.userName,
                    { color: theme.text },
                    hasUnread && styles.userNameUnread
                  ]}
                  numberOfLines={1}
                >
                  {item.device?.name || 'Objeto'}
                </Text>
                <Text style={[styles.timeAgo, { color: hasUnread ? theme.primary.main : theme.textTertiary }]}>
                  {timeAgo}
                </Text>
              </View>
              {item.lastMessage && (
                <Text
                  style={[
                    styles.lastMessage,
                    { color: hasUnread ? theme.text : theme.textSecondary },
                    hasUnread && styles.lastMessageUnread
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
              )}
            </View>
          </View>

          {hasUnread && (
            <UnreadBadge count={item.unreadCount!} size="small" />
          )}
        </View>
      </TouchableOpacity>
      </FadeInView>
    );
  };

  const handleConversationPress = (conversation: ConversationPreview) => {
    if (conversation.isGroupChat) {
      navigation.navigate('Chat' as never, {
        conversationId: conversation.id,
        groupId: conversation.groupId,
        isGroupChat: true,
        groupName: conversation.group?.name,
      } as never);
    } else {
      navigation.navigate('Chat' as never, {
        conversationId: conversation.id,
        eventId: conversation.eventId,
        otherUserId: conversation.otherUser?.id,
      } as never);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await api.delete(`/conversations/${conversationId}`);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      showSuccess('Conversación eliminada');
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      showError('No se pudo eliminar la conversación');
    }
  };

  const handleLeaveGroup = async (conversation: ConversationPreview) => {
    if (!conversation.groupId) return;

    try {
      await api.post(`/groups/${conversation.groupId}/leave`);
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
      showSuccess('Has salido del grupo');
    } catch (error: any) {
      console.error('Error leaving group:', error);
      showError('No se pudo salir del grupo');
    }
  };

  const renderConversation = ({ item, index }: { item: ConversationPreview; index: number }) => (
    <FadeInView delay={index * 40} duration={300} slideFrom={10}>
      <SwipeableConversation
        item={item}
        onPress={() => handleConversationPress(item)}
        onDelete={() => handleDeleteConversation(item.id)}
        onLeaveGroup={() => handleLeaveGroup(item)}
        theme={theme}
        isDark={isDark}
      />
    </FadeInView>
  );

  const clearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.glass.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Mensajes</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* SVG Background Pattern with Objects */}
      <ObjectsPatternBackground />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.glass.border }]}>
        <TouchableOpacity
          style={[styles.backButtonContainer, { backgroundColor: theme.glass.bg }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Mensajes</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
            {conversations.length} {conversations.length === 1 ? 'conversación' : 'conversaciones'}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.bg, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'messages' && [styles.tabActive, { borderBottomColor: theme.primary.main }],
          ]}
          onPress={() => setActiveTab('messages')}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={18}
            color={activeTab === 'messages' ? theme.primary.main : theme.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'messages' ? theme.primary.main : theme.textTertiary },
            ]}
          >
            Mensajes
          </Text>
          {conversations.filter(c => c.unreadCount > 0).length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: theme.primary.main }]}>
              <Text style={styles.tabBadgeText}>
                {conversations.filter(c => c.unreadCount > 0).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'found' && [styles.tabActive, { borderBottomColor: '#FF9500' }],
          ]}
          onPress={() => setActiveTab('found')}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={activeTab === 'found' ? '#FF9500' : theme.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'found' ? '#FF9500' : theme.textTertiary },
            ]}
          >
            Tags
          </Text>
          {foundChats.filter(c => c.status === 'ACTIVE').length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#FF9500' }]}>
              <Text style={styles.tabBadgeText}>
                {foundChats.filter(c => c.status === 'ACTIVE').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: isDark ? 'rgba(58, 58, 60, 0.8)' : 'rgba(255,255,255,0.8)', borderColor: isSearchFocused ? theme.primary.main : 'transparent' },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={activeTab === 'messages' ? 'Buscar conversaciones...' : 'Buscar tags...'}
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List based on active tab */}
      <FlatList
        data={activeTab === 'messages' ? filteredConversations : filteredFoundChats}
        renderItem={activeTab === 'messages' ? renderConversation : renderFoundChat}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary.main}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {searchQuery.trim() ? (
              <>
                <View style={[styles.noResultsIcon, { backgroundColor: theme.glass.bg }]}>
                  <Ionicons name="search-outline" size={40} color={theme.textTertiary} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                  Sin resultados
                </Text>
                <Text style={[styles.emptyStateMessage, { color: theme.textSecondary }]}>
                  No se encontraron conversaciones para "{searchQuery}"
                </Text>
                <TouchableOpacity
                  style={[styles.clearSearchButton, { backgroundColor: theme.primary.subtle }]}
                  onPress={clearSearch}
                >
                  <Ionicons name="close-circle-outline" size={16} color={theme.primary.main} />
                  <Text style={[styles.clearSearchText, { color: theme.primary.main }]}>
                    Limpiar búsqueda
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <AnimatedEmptyIllustration isDark={isDark} />
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                  No tienes mensajes
                </Text>
                <Text style={[styles.emptyStateMessage, { color: theme.textSecondary }]}>
                  Los mensajes de eventos urgentes aparecerán aquí
                </Text>
                <View style={[styles.emptyHint, { backgroundColor: theme.primary.subtle }]}>
                  <Ionicons name="chatbubbles-outline" size={16} color={theme.primary.main} />
                  <Text style={[styles.emptyHintText, { color: theme.primary.main }]}>
                    Responde a eventos para iniciar conversaciones
                  </Text>
                </View>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 0,
    zIndex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  deleteAction: {
    width: DELETE_BUTTON_WIDTH,
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationCard: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: ROW_HEIGHT,
  },
  conversationTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ROW_HEIGHT,
    paddingHorizontal: 16,
  },
  conversationLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  eventBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  userNameUnread: {
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
  conversationRight: {
    marginLeft: 8,
  },
  emptyGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyGroupText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  startChatCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  startChatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  emptyHintText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noResultsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  clearSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Tab styles
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
