import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import { ObjectsPatternBackground } from '../components/ObjectsPatternBackground';
import { wsService } from '../services/websocket';
import { useTheme } from '../contexts/ThemeContext';
import UserAvatar from '../components/UserAvatar';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  Chat: {
    conversationId: string;
    eventId?: string;
    otherUserId?: string;
    // Group chat params
    isGroupChat?: boolean;
    groupId?: string;
    groupName?: string;
  };
};

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}

interface Conversation {
  id: string;
  eventId?: string;
  groupId?: string;
  isGroupChat?: boolean;
  event?: {
    id: string;
    type: string;
    description: string;
    isUrgent: boolean;
  };
  group?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  participants: Array<{
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      imageUrl?: string;
    };
  }>;
  messages: Message[];
}

export default function ChatScreen() {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { conversationId, eventId, otherUserId, isGroupChat, groupId, groupName } = route.params;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserImage, setOtherUserImage] = useState<string | null>(null);
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [isSelfConversation, setIsSelfConversation] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCurrentUser();
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    // Setup WebSocket listeners
    const handleMessageSent = (data: any) => {
      console.log('[Chat] Received message_sent:', data);
      if (data?.conversationId === conversationId && data?.message) {
        // Avoid adding duplicate messages
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const handleTypingStart = (data: any) => {
      if (data.conversationId === conversationId && data.userId === otherUserId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.conversationId === conversationId && data.userId === otherUserId) {
        setIsTyping(false);
      }
    };

    // Register listeners
    wsService.on('message_sent', handleMessageSent);
    wsService.on('typing_start', handleTypingStart);
    wsService.on('typing_stop', handleTypingStop);

    // Join conversation room
    if (currentUserId) {
      wsService.connect(currentUserId).then(() => {
        wsService.joinConversation(conversationId);
      });
    }

    // Cleanup
    return () => {
      wsService.off('message_sent', handleMessageSent);
      wsService.off('typing_start', handleTypingStart);
      wsService.off('typing_stop', handleTypingStop);
      wsService.leaveConversation(conversationId);
    };
  }, [conversationId, currentUserId, otherUserId]);

  useEffect(() => {
    // Mark messages as read when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      markAsRead();
    });
    return unsubscribe;
  }, [navigation, conversationId]);

  const loadCurrentUser = async () => {
    try {
      const response = await api.get('/users/profile');
      setCurrentUserId(response.data.id);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadConversation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/conversations/${conversationId}`);
      setConversation(response.data);
      setMessages(response.data.messages || []);

      // Handle group chat vs 1-to-1 chat
      if (response.data.isGroupChat || isGroupChat) {
        // For group chats, use group name from params or conversation
        setOtherUserName(groupName || response.data.group?.name || 'Chat Grupal');
        setParticipantCount(response.data.participants?.length || 0);
        if (response.data.group?.imageUrl) {
          setGroupImage(response.data.group.imageUrl);
        }
      } else {
        // Check if this is a self-conversation (Saved Messages)
        const isSelfConversation = response.data.participants.length === 2 &&
          response.data.participants.every((p: any) => p.userId === currentUserId || p.userId === otherUserId) &&
          currentUserId === otherUserId;

        if (isSelfConversation) {
          setIsSelfConversation(true);
          setOtherUserName('Mensajes Guardados');
        } else {
          // Get other user's name for 1-to-1 chat
          const otherParticipant = response.data.participants.find(
            (p: any) => p.userId === otherUserId
          );
          if (otherParticipant) {
            setOtherUserName(otherParticipant.user.name);
            if (otherParticipant.user.imageUrl) {
              setOtherUserImage(otherParticipant.user.imageUrl);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await api.put(`/conversations/${conversationId}/read`);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      const response = await api.post(`/conversations/${conversationId}/messages`, {
        content,
      });

      const newMessage = response.data;

      // Add message to list
      setMessages((prev) => [...prev, newMessage]);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTypingStart = () => {
    wsService.sendTypingStart(conversationId);
  };

  const handleTypingStop = () => {
    wsService.sendTypingStop(conversationId);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const showSenderName = (isGroupChat || conversation?.isGroupChat) && !isOwnMessage;
    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        showSenderName={showSenderName}
      />
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Chat</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* SVG Background Pattern with Objects */}
      <ObjectsPatternBackground height={SCREEN_HEIGHT} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        {isGroupChat || conversation?.isGroupChat ? (
          // Group chat header
          <TouchableOpacity
            style={styles.headerCenter}
            onPress={() =>
              navigation.navigate('GroupDetail' as never, { groupId: groupId || conversation?.groupId } as never)
            }
          >
            {groupImage ? (
              <Image source={{ uri: groupImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, styles.groupAvatar]}>
                <Ionicons name="people" size={20} color="#fff" />
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>{otherUserName}</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                {participantCount} participantes
              </Text>
            </View>
          </TouchableOpacity>
        ) : isSelfConversation ? (
          // Self-conversation (Saved Messages) header
          <View style={styles.headerCenter}>
            <View style={[styles.avatar, styles.savedMessagesAvatar]}>
              <Ionicons name="bookmark" size={20} color="#fff" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>{otherUserName}</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Notas personales</Text>
            </View>
          </View>
        ) : (
          // 1-to-1 chat header
          <View style={styles.headerCenter}>
            {/* Avatar - tap to view full image */}
            <TouchableOpacity
              style={{ marginRight: 10 }}
              onPress={() => otherUserImage && setShowImageViewer(true)}
              activeOpacity={otherUserImage ? 0.7 : 1}
            >
              <UserAvatar
                imageUrl={otherUserImage}
                name={otherUserName}
                size={36}
                backgroundColor={theme.primary.main}
              />
            </TouchableOpacity>
            {/* Name/Info - tap to view profile */}
            <TouchableOpacity
              style={styles.headerTextContainer}
              onPress={() =>
                navigation.navigate('UserProfile' as never, { userId: otherUserId } as never)
              }
            >
              <Text style={[styles.headerTitle, { color: theme.text }]}>{otherUserName}</Text>
              {conversation?.event && (
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {conversation.event.description}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.backButton} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              No hay mensajes aún.{'\n'}Envía el primero!
            </Text>
          </View>
        }
      />

      {/* Typing Indicator */}
      <TypingIndicator userName={otherUserName} visible={isTyping} />

      {/* Chat Input */}
      <ChatInput
        onSend={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
      />

      {/* Profile Image Viewer Modal - WhatsApp style */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
        <Pressable
          style={styles.imageViewerContainer}
          onPress={() => setShowImageViewer(false)}
        >
          {/* Header */}
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.imageViewerCloseBtn}
              onPress={() => setShowImageViewer(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.imageViewerHeaderInfo}>
              <Text style={styles.imageViewerName}>{otherUserName}</Text>
              <Text style={styles.imageViewerSubtitle}>Foto de perfil</Text>
            </View>
          </View>

          {/* Image */}
          <View style={styles.imageViewerContent}>
            {otherUserImage && (
              <Image
                source={{ uri: otherUserImage }}
                style={styles.imageViewerImage}
                contentFit="contain"
                transition={200}
              />
            )}
          </View>

          {/* Footer hint */}
          <View style={styles.imageViewerFooter}>
            <Text style={styles.imageViewerHint}>Toca para cerrar</Text>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  groupAvatar: {
    backgroundColor: '#34C759',
  },
  savedMessagesAvatar: {
    backgroundColor: '#FF9500',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  // Image Viewer Modal Styles - WhatsApp style
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  imageViewerCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerHeaderInfo: {
    flex: 1,
    marginLeft: 8,
  },
  imageViewerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  imageViewerSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  imageViewerFooter: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  imageViewerHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
  },
});
