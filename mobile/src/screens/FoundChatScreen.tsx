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
  Modal,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { foundChatsApi, FoundChatDetail, FoundObjectMessage, notificationApi } from '../services/api';
import ChatInput from '../components/chat/ChatInput';
import MessageBubble from '../components/chat/MessageBubble';
import ActionSheet, { ActionSheetOption } from '../components/ActionSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';

// Get initials from name (1-2 characters)
const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

type RootStackParamList = {
  FoundChat: {
    chatId: string;
  };
};

type FoundChatRouteProp = RouteProp<RootStackParamList, 'FoundChat'>;

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Activo',
    color: '#34C759',
    bgColor: '#E8F8ED',
  },
  RESOLVED: {
    label: 'Recuperado',
    color: '#007AFF',
    bgColor: '#E3F2FD',
  },
  CLOSED: {
    label: 'Cerrado',
    color: '#8E8E93',
    bgColor: '#F2F2F7',
  },
};

export function FoundChatScreen() {
  const route = useRoute<FoundChatRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const { theme } = useTheme();
  const { chatId } = route.params;

  const [chat, setChat] = useState<FoundChatDetail | null>(null);
  const [messages, setMessages] = useState<FoundObjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Modal states
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'RESOLVED' | 'CLOSED' | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  useEffect(() => {
    // Refresh on focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadChat();
    });
    return unsubscribe;
  }, [navigation, chatId]);

  const loadChat = async () => {
    try {
      setLoading(true);
      const data = await foundChatsApi.getChat(chatId);
      setChat(data);
      setMessages(data.messages || []);

      // Mark related notifications as read
      markNotificationsAsRead();
    } catch (error) {
      console.error('Error loading found chat:', error);
      showError('No se pudo cargar el chat');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      // Get all unread notifications and mark those related to this chat
      const notifications = await notificationApi.getUserNotifications(true);
      for (const notif of notifications) {
        if (notif.chatId === chatId && !notif.isRead) {
          await notificationApi.markAsRead(notif.id);
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!chat || sending) return;

    setSending(true);
    try {
      const newMessage = await foundChatsApi.sendOwnerMessage(chatId, content);
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      showError('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = (newStatus: 'RESOLVED' | 'CLOSED') => {
    setPendingStatus(newStatus);
    setShowActionSheet(false);
    setShowConfirmModal(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;

    const statusLabel = pendingStatus === 'RESOLVED' ? 'recuperado' : 'cerrado';
    setShowConfirmModal(false);
    setUpdatingStatus(true);

    try {
      const updated = await foundChatsApi.updateStatus(chatId, pendingStatus);
      setChat(updated);
      showSuccess(`El chat ha sido marcado como ${statusLabel}`);
    } catch (error) {
      showError('No se pudo actualizar el estado');
    } finally {
      setUpdatingStatus(false);
      setPendingStatus(null);
    }
  };

  const showStatusOptions = () => {
    setShowActionSheet(true);
  };

  const actionSheetOptions: ActionSheetOption[] = [
    {
      label: 'Marcar como recuperado',
      icon: 'checkmark-circle-outline',
      onPress: () => handleStatusChange('RESOLVED'),
    },
    {
      label: 'Cerrar chat',
      icon: 'close-circle-outline',
      onPress: () => handleStatusChange('CLOSED'),
      destructive: true,
    },
  ];

  const renderMessage = ({ item }: { item: FoundObjectMessage }) => {
    // Transform FoundObjectMessage to match MessageBubble's expected format
    const messageForBubble = {
      id: item.id,
      content: item.content,
      createdAt: item.createdAt,
      isRead: true, // Found chats don't track read status per message
      senderId: item.isOwner ? 'owner' : 'finder',
    };

    return (
      <MessageBubble
        message={messageForBubble}
        isOwnMessage={item.isOwner}
        showTimestamp={true}
      />
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg.primary }]}>
        <View style={[styles.header, { backgroundColor: theme.bg.primary, borderBottomColor: theme.glass.border }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.glass.bg }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Chat</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary.main} />
        </View>
      </View>
    );
  }

  if (!chat) return null;

  const statusConfig = STATUS_CONFIG[chat.status];
  const finderDisplay = chat.finderName || 'Alguien';
  const deviceName = chat.device?.name || 'Objeto';
  const canSendMessages = chat.status === 'ACTIVE';
  const initials = getInitials(finderDisplay);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bg.primary, borderBottomColor: theme.glass.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.glass.bg }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>{finderDisplay}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>encontro "{deviceName}"</Text>
          </View>
        </View>

        {chat.status === 'ACTIVE' && (
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.glass.bg }]}
            onPress={showStatusOptions}
            disabled={updatingStatus}
          >
            {updatingStatus ? (
              <ActivityIndicator size="small" color={theme.primary.main} />
            ) : (
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.text.primary} />
            )}
          </TouchableOpacity>
        )}
        {chat.status !== 'ACTIVE' && <View style={styles.backButton} />}
      </View>

      {/* Status Banner */}
      {chat.status !== 'ACTIVE' && (
        <View style={[styles.statusBanner, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons
            name={chat.status === 'RESOLVED' ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={statusConfig.color}
          />
          <Text style={[styles.statusBannerText, { color: statusConfig.color }]}>
            {chat.status === 'RESOLVED'
              ? 'Objeto recuperado'
              : 'Chat cerrado'}
          </Text>
        </View>
      )}

      {/* Device Info Card */}
      <View style={styles.deviceCard}>
        <View style={styles.deviceIcon}>
          <Ionicons name="pricetag" size={20} color="#007AFF" />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceCardName}>{deviceName}</Text>
          <Text style={styles.deviceCardHint}>
            Comparte solo la informacion que desees
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusConfig.bgColor }]}>
          <Text style={[styles.statusChipText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>
              Aun no hay mensajes.{'\n'}¡Inicia la conversacion!
            </Text>
          </View>
        }
      />

      {/* Chat Input or Closed Message */}
      {canSendMessages ? (
        <ChatInput
          onSend={handleSendMessage}
          onTypingStart={() => {}}
          onTypingStop={() => {}}
        />
      ) : (
        <View style={styles.closedInput}>
          <Ionicons name="lock-closed" size={18} color="#8E8E93" />
          <Text style={styles.closedInputText}>
            Este chat esta {chat.status === 'RESOLVED' ? 'resuelto' : 'cerrado'}
          </Text>
        </View>
      )}

      {/* Action Sheet for status options */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title="Cambiar estado"
        subtitle="Selecciona el nuevo estado del chat"
        options={actionSheetOptions}
      />

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowConfirmModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={[
                styles.modalIconContainer,
                { backgroundColor: pendingStatus === 'RESOLVED' ? '#E8F8ED' : '#FFE5E5' }
              ]}>
                <Ionicons
                  name={pendingStatus === 'RESOLVED' ? 'checkmark-circle' : 'close-circle'}
                  size={32}
                  color={pendingStatus === 'RESOLVED' ? '#34C759' : '#FF3B30'}
                />
              </View>
              <Text style={styles.modalTitle}>
                {pendingStatus === 'RESOLVED'
                  ? 'Marcar como recuperado'
                  : 'Cerrar chat'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {pendingStatus === 'RESOLVED'
                  ? '¿Has recuperado tu objeto? Esto notificara a quien lo encontro.'
                  : '¿Cerrar este chat? Ya no podras recibir mensajes.'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowConfirmModal(false);
                  setPendingStatus(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonConfirm,
                  { backgroundColor: pendingStatus === 'RESOLVED' ? '#34C759' : '#FF3B30' }
                ]}
                onPress={confirmStatusChange}
              >
                <Text style={styles.modalButtonConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  deviceCardHint: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  closedInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 8,
  },
  closedInputText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#E5E5EA',
  },
  modalButtonCancelText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#007AFF',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
