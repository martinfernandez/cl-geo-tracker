import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { eventApi, reactionApi, commentApi, Comment, api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { UrgentPulsingDot } from '../components/UrgentPulsingDot';
import { BASE_URL } from '../config/environment';
import { stopBackgroundTracking } from '../services/backgroundLocation';
import UserAvatar from '../components/UserAvatar';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params: { eventId: string } }, 'params'>;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  THEFT: 'Robo',
  LOST: 'Extravio',
  ACCIDENT: 'Accidente',
  FIRE: 'Incendio',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  GENERAL: '#007AFF',
  THEFT: '#FF3B30',
  LOST: '#FF9500',
  ACCIDENT: '#FFCC00',
  FIRE: '#FF2D55',
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  GENERAL: 'megaphone-outline',
  THEFT: 'warning-outline',
  LOST: 'search-outline',
  ACCIDENT: 'car-outline',
  FIRE: 'flame-outline',
};

// Format relative time like Instagram/social feeds
const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hace un momento';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? 'hace 1 min' : `hace ${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? 'hace 1 hora' : `hace ${diffInHours} horas`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? 'hace 1 dia' : `hace ${diffInDays} dias`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? 'hace 1 semana' : `hace ${diffInWeeks} semanas`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? 'hace 1 mes' : `hace ${diffInMonths} meses`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? 'hace 1 ano' : `hace ${diffInYears} anos`;
};

export default function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { showSuccess, showError } = useToast();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [trackedPositions, setTrackedPositions] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [eventConversations, setEventConversations] = useState<any[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);

  const handleScrollToComments = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 300);
  };

  useEffect(() => {
    loadEventDetails();
    loadCurrentUser();
  }, [eventId]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await api.get('/users/profile');
      setCurrentUserId(response.data.id);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadEventConversations = async () => {
    if (!event || !currentUserId || event.userId !== currentUserId) return;

    try {
      const response = await api.get(`/events/${eventId}/conversations`);
      setEventConversations(response.data);
      const totalUnread = response.data.reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0);
      setUnreadMessageCount(totalUnread);
    } catch (error) {
      console.error('Error loading event conversations:', error);
    }
  };

  useEffect(() => {
    if (event && currentUserId && event.userId === currentUserId && event.isUrgent) {
      loadEventConversations();
    }
  }, [event?.id, currentUserId]);

  useEffect(() => {
    if (event?.realTimeTracking && event?.status === 'IN_PROGRESS') {
      loadTrackedPositions();
      const interval = setInterval(loadTrackedPositions, 30000);
      return () => clearInterval(interval);
    }
  }, [event?.realTimeTracking, event?.status]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const [eventData, commentsData] = await Promise.all([
        eventApi.getPublicById(eventId).catch(() => eventApi.getById(eventId)),
        commentApi.getEventComments(eventId),
      ]);
      setEvent(eventData);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading event details:', error);
      showError('No se pudo cargar el evento');
    } finally {
      setLoading(false);
    }
  };

  const loadTrackedPositions = async () => {
    try {
      const data = await eventApi.getEventPositions(eventId);
      if (data.positions && data.positions.length > 0) {
        const positions = data.positions.map((pos: any) => ({
          latitude: Number(pos.latitude),
          longitude: Number(pos.longitude),
        }));
        setTrackedPositions(positions);
      }
    } catch (error) {
      console.error('Error loading tracked positions:', error);
    }
  };

  const handleReaction = async () => {
    try {
      const result = await reactionApi.toggleReaction(eventId);
      setEvent((prev: any) => ({
        ...prev,
        userReacted: result.liked,
        reactionCount: prev.reactionCount + (result.liked ? 1 : -1),
      }));
    } catch (error) {
      console.error('Error toggling reaction:', error);
      showError('No se pudo actualizar la reaccion');
    }
  };

  const handleOpenChat = async () => {
    try {
      const response = await api.post('/conversations', {
        eventId: event.id,
        otherUserId: event.userId,
      });
      const conversation = response.data;
      navigation.navigate('Chat' as never, {
        conversationId: conversation.id,
        eventId: event.id,
        otherUserId: event.userId,
      } as never);
    } catch (error: any) {
      console.error('Error opening chat:', error);
      showError('No se pudo abrir el chat');
    }
  };

  const handleOpenEventInbox = () => {
    if (eventConversations.length === 1) {
      const conv = eventConversations[0];
      navigation.navigate('Chat' as never, {
        conversationId: conv.id,
        eventId: event.id,
        otherUserId: conv.otherUser?.id,
      } as never);
    } else {
      navigation.navigate('Inbox' as never, { eventId: event.id } as never);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const newComment = await commentApi.createComment(eventId, {
        content: commentText.trim(),
        parentCommentId: replyingTo || undefined,
      });

      setComments((prevComments) => [newComment, ...prevComments]);
      setCommentText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting comment:', error);
      showError('No se pudo enviar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);

  const handleToggleStatus = () => {
    setShowActionSheet(false);
    setShowStatusConfirmModal(true);
  };

  const confirmToggleStatus = async () => {
    setShowStatusConfirmModal(false);
    try {
      const newStatus = event.status === 'IN_PROGRESS' ? 'CLOSED' : 'IN_PROGRESS';
      await eventApi.update(eventId, { status: newStatus });
      setEvent((prev: any) => ({ ...prev, status: newStatus }));

      // Stop background tracking if closing an event that uses phoneDevice
      if (newStatus === 'CLOSED' && event.phoneDeviceId && event.realTimeTracking) {
        console.log('[EventDetail] Stopping background tracking for closed event');
        await stopBackgroundTracking();
      }

      showSuccess(
        newStatus === 'CLOSED' ? 'Evento cerrado' : 'Evento reabierto'
      );
    } catch (error) {
      console.error('Error toggling event status:', error);
      showError('No se pudo actualizar el estado');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const result = await commentApi.toggleCommentLike(commentId);
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likes: result.liked
                ? [...(comment.likes || []), { id: Date.now().toString(), userId: currentUserId!, createdAt: new Date().toISOString() }]
                : comment.likes?.filter((like) => like.userId !== currentUserId) || [],
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) => {
                if (reply.id === commentId) {
                  return {
                    ...reply,
                    likes: result.liked
                      ? [...(reply.likes || []), { id: Date.now().toString(), userId: currentUserId!, createdAt: new Date().toISOString() }]
                      : reply.likes?.filter((like) => like.userId !== currentUserId) || [],
                  };
                }
                return reply;
              }),
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Error toggling comment like:', error);
      showError('No se pudo actualizar el like');
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await commentApi.deleteComment(commentToDelete);
      await loadEventDetails();
      showSuccess('Comentario eliminado');
    } catch (error) {
      console.error('Error deleting comment:', error);
      showError('No se pudo eliminar el comentario');
    } finally {
      setShowDeleteConfirm(false);
      setCommentToDelete(null);
    }
  };

  const handleViewUserProfile = () => {
    setShowUserMenu(false);
    navigation.navigate('UserProfile' as never, { userId: event.user.id } as never);
  };

  const getUserInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const likeCount = comment.likes?.length || 0;
    const userLiked = comment.likes?.some((like) => like.userId === currentUserId);
    const isOwnComment = comment.user.id === currentUserId;

    return (
      <View
        key={comment.id}
        style={[
          styles.commentContainer,
          { backgroundColor: isDark ? '#2C2C2E' : '#fafafa', borderColor: theme.glass.border },
          isReply && [styles.replyContainer, { backgroundColor: theme.bg }]
        ]}
      >
        <View style={styles.commentHeader}>
          <TouchableOpacity
            style={styles.commentUserRow}
            onPress={() => navigation.navigate('UserProfile' as never, { userId: comment.user.id } as never)}
          >
            <View style={[styles.commentAvatar, { backgroundColor: theme.primary.main }]}>
              <Text style={styles.commentAvatarText}>{getUserInitial(comment.user.name)}</Text>
            </View>
            <Text style={[styles.commentAuthor, { color: theme.text }]}>{comment.user.name}</Text>
          </TouchableOpacity>
          <View style={styles.commentHeaderRight}>
            <Text style={[styles.commentDate, { color: theme.textTertiary }]}>
              {formatRelativeTime(comment.createdAt)}
            </Text>
            {isOwnComment && (
              <TouchableOpacity
                onPress={() => handleDeleteComment(comment.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={16} color={theme.error.main} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[styles.commentContent, { color: theme.text }]}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={() => setReplyingTo(comment.id)}
            style={styles.replyButton}
          >
            <Text style={[styles.replyButtonText, { color: theme.primary.main }]}>Responder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCommentLike(comment.id)}
            style={styles.likeButton}
          >
            <Ionicons
              name={userLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={userLiked ? '#ed4956' : theme.textTertiary}
            />
            {likeCount > 0 && (
              <Text style={[styles.likeCount, { color: theme.textTertiary }, userLiked && styles.likeCountActive]}>
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary.main} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.bg }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>No se pudo cargar el evento</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.primary.main }]}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = currentUserId && event?.userId === currentUserId;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
      keyboardVerticalOffset={0}
    >
      {/* Header - Simple back button */}
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.glass.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowActionSheet(true)}
            style={styles.headerButton}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Map - Full width, first */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: event.latitude,
              longitude: event.longitude,
              latitudeDelta: trackedPositions.length > 0 ? 0.02 : 0.01,
              longitudeDelta: trackedPositions.length > 0 ? 0.02 : 0.01,
            }}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            <Marker
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
            >
              <View style={[styles.mapMarker, { backgroundColor: EVENT_TYPE_COLORS[event.type] || '#007AFF' }]}>
                <Ionicons name={EVENT_TYPE_ICONS[event.type] as any || 'megaphone-outline'} size={16} color="#fff" />
              </View>
            </Marker>

            {event.realTimeTracking && trackedPositions.length > 1 && (
              <Polyline
                coordinates={trackedPositions}
                strokeColor="#5856D6"
                strokeWidth={4}
                geodesic={true}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {event.realTimeTracking && trackedPositions.length > 0 && (
              <Marker
                coordinate={trackedPositions[trackedPositions.length - 1]}
                pinColor="#007AFF"
                title="Posicion actual"
              />
            )}
          </MapView>

          {event.realTimeTracking && (
            <View
              style={[
                styles.trackingIndicator,
                event.status === 'IN_PROGRESS'
                  ? styles.trackingIndicatorActive
                  : styles.trackingIndicatorClosed,
              ]}
            >
              <Ionicons
                name={event.status === 'IN_PROGRESS' ? 'locate' : 'checkmark-circle'}
                size={16}
                color="#fff"
              />
              <Text style={styles.trackingIndicatorText}>
                {event.status === 'IN_PROGRESS'
                  ? `Rastreo activo`
                  : `Rastreo finalizado`}
              </Text>
            </View>
          )}
        </View>

        {/* User Header - Below map */}
        <View style={[styles.userHeader, { backgroundColor: theme.bg }]}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => navigation.navigate('UserProfile' as never, { userId: event.user.id } as never)}
          >
            <UserAvatar
              imageUrl={event.user.imageUrl}
              name={event.user.name}
              size={40}
              backgroundColor={EVENT_TYPE_COLORS[event.type] || '#007AFF'}
            />
            <View style={styles.userTextContainer}>
              <Text style={[styles.userName, { color: theme.text }]}>{event.user.name}</Text>
              <View style={styles.userSubtitle}>
                {event.isUrgent && <UrgentPulsingDot size="small" />}
                <View style={[styles.typeBadgeSmall, { backgroundColor: EVENT_TYPE_COLORS[event.type] || '#007AFF' }]}>
                  <Ionicons name={EVENT_TYPE_ICONS[event.type] as any || 'megaphone-outline'} size={10} color="#fff" />
                  <Text style={styles.typeBadgeSmallText}>{EVENT_TYPE_LABELS[event.type] || 'General'}</Text>
                </View>
                {event.status === 'CLOSED' && (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>Cerrado</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowUserMenu(true)}
            style={styles.userMenuButton}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Image - Full width, edge-to-edge */}
        {event.imageUrl && (
          <Image
            source={{ uri: event.imageUrl.startsWith('http') ? event.imageUrl : `${BASE_URL}${event.imageUrl}` }}
            style={styles.eventImage}
          />
        )}

        {/* Interaction Bar */}
        <View style={[styles.interactionBar, { backgroundColor: theme.bg }]}>
          <View style={styles.interactionLeft}>
            <TouchableOpacity
              style={styles.interactionButton}
              onPress={handleReaction}
            >
              <Ionicons
                name={event.userReacted ? 'heart' : 'heart-outline'}
                size={26}
                color={event.userReacted ? '#ed4956' : theme.text}
              />
              {(event.reactionCount || 0) > 0 && (
                <Text style={[styles.interactionCount, { color: theme.text }, event.userReacted && styles.interactionCountActive]}>
                  {event.reactionCount}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.interactionButton}
              onPress={handleScrollToComments}
            >
              <Ionicons name="chatbubble-outline" size={24} color={theme.text} />
              {comments.length > 0 && (
                <Text style={[styles.interactionCount, { color: theme.text }]}>{comments.length}</Text>
              )}
            </TouchableOpacity>

            {event.isUrgent && event.userId !== currentUserId && (
              <TouchableOpacity
                style={styles.interactionButton}
                onPress={handleOpenChat}
              >
                <Ionicons name="paper-plane-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            )}

            {event.isUrgent && event.userId === currentUserId && eventConversations.length > 0 && (
              <TouchableOpacity
                style={styles.interactionButton}
                onPress={handleOpenEventInbox}
              >
                <View>
                  <Ionicons name="chatbubbles-outline" size={24} color={theme.text} />
                  {unreadMessageCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Status toggle for owner */}
          {isOwner ? (
            <TouchableOpacity
              style={[
                styles.statusToggleButton,
                event.status === 'IN_PROGRESS'
                  ? { backgroundColor: 'rgba(255, 149, 0, 0.15)', borderColor: '#FF9500' }
                  : { backgroundColor: 'rgba(52, 199, 89, 0.15)', borderColor: '#34C759' }
              ]}
              onPress={handleToggleStatus}
              activeOpacity={0.7}
            >
              <Ionicons
                name={event.status === 'IN_PROGRESS' ? 'time' : 'checkmark-circle'}
                size={16}
                color={event.status === 'IN_PROGRESS' ? '#FF9500' : '#34C759'}
              />
              <Text style={[
                styles.statusToggleText,
                { color: event.status === 'IN_PROGRESS' ? '#FF9500' : '#34C759' }
              ]}>
                {event.status === 'IN_PROGRESS' ? 'En progreso' : 'Cerrado'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={event.status === 'IN_PROGRESS' ? '#FF9500' : '#34C759'}
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.timeBadge, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}>
              <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
              <Text style={[styles.timeBadgeText, { color: theme.textTertiary }]}>{formatRelativeTime(event.createdAt)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={[styles.descriptionContainer, { backgroundColor: theme.bg }]}>
          <Text style={[styles.description, { color: theme.text }]}>
            <Text style={styles.descriptionUserName}>{event.user.name} </Text>
            {event.description}
          </Text>
        </View>

        {/* Device info if available */}
        {event.device && (
          <View style={[styles.deviceInfo, { backgroundColor: theme.bg }]}>
            <Ionicons name="hardware-chip-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.deviceText, { color: theme.textTertiary }]}>
              Dispositivo: {event.device.name || event.device.imei}
            </Text>
          </View>
        )}

        {/* Comments Section */}
        <View style={[styles.commentsSection, { backgroundColor: theme.bg, borderTopColor: theme.glass.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Comentarios</Text>

          {comments.length === 0 ? (
            <Text style={[styles.noCommentsText, { color: theme.textTertiary }]}>
              No hay comentarios aun. Se el primero en comentar!
            </Text>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment) => renderComment(comment))}
            </View>
          )}
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fixed Comment Input at Bottom */}
      <View style={[
        styles.fixedInputContainer,
        { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 16), backgroundColor: theme.bg, borderTopColor: theme.glass.border }
      ]}>
        {replyingTo && (
          <View style={[styles.replyingToBar, { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' }]}>
            <Text style={[styles.replyingToText, { color: theme.textSecondary }]}>
              Respondiendo a un comentario
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.commentInputContainer, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}>
          <TextInput
            ref={commentInputRef}
            style={[styles.commentInput, { color: theme.text }]}
            placeholder={
              replyingTo ? 'Escribe una respuesta...' : 'Escribe un comentario...'
            }
            placeholderTextColor={theme.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            textAlignVertical="center"
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
            style={[
              styles.sendButton,
              (!commentText.trim() || submitting) && styles.sendButtonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.primary.main} />
            ) : (
              <Ionicons name="send" size={20} color={theme.primary.main} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Owner Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.actionSheetHandle, { backgroundColor: isDark ? '#48484A' : '#d0d0d0' }]} />

            <TouchableOpacity
              style={[styles.actionSheetButton, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}
              onPress={handleToggleStatus}
            >
              <Ionicons
                name={event?.status === 'IN_PROGRESS' ? 'checkmark-circle-outline' : 'play-circle-outline'}
                size={24}
                color={theme.text}
              />
              <Text style={[styles.actionSheetButtonText, { color: theme.text }]}>
                {event?.status === 'IN_PROGRESS' ? 'Cerrar evento' : 'Reabrir evento'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetButton, styles.actionSheetButtonCancel, { backgroundColor: theme.surface, borderColor: isDark ? '#48484A' : '#d0d0d0' }]}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={[styles.actionSheetButtonCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* User Menu Modal - Three dots menu */}
      <Modal
        visible={showUserMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.actionSheetHandle, { backgroundColor: isDark ? '#48484A' : '#d0d0d0' }]} />

            <TouchableOpacity
              style={[styles.actionSheetButton, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}
              onPress={handleViewUserProfile}
            >
              <Ionicons name="person-outline" size={24} color={theme.text} />
              <Text style={[styles.actionSheetButtonText, { color: theme.text }]}>Ver perfil de {event.user.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetButton, styles.actionSheetButtonCancel, { backgroundColor: theme.surface, borderColor: isDark ? '#48484A' : '#d0d0d0' }]}
              onPress={() => setShowUserMenu(false)}
            >
              <Text style={[styles.actionSheetButtonCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status Change Confirmation Modal */}
      <Modal
        visible={showStatusConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusConfirmModal(false)}
      >
        <Pressable
          style={styles.deleteModalOverlay}
          onPress={() => setShowStatusConfirmModal(false)}
        >
          <Pressable style={[styles.deleteModalContent, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.deleteModalIcon, { backgroundColor: event?.status === 'IN_PROGRESS' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 149, 0, 0.15)' }]}>
              <Ionicons
                name={event?.status === 'IN_PROGRESS' ? 'checkmark-circle' : 'play-circle'}
                size={48}
                color={event?.status === 'IN_PROGRESS' ? '#34C759' : '#FF9500'}
              />
            </View>
            <Text style={[styles.deleteModalTitle, { color: theme.text }]}>
              {event?.status === 'IN_PROGRESS' ? 'Cerrar evento?' : 'Reabrir evento?'}
            </Text>
            <Text style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
              {event?.status === 'IN_PROGRESS'
                ? event?.realTimeTracking
                  ? 'Se detendra el rastreo en tiempo real y el evento se marcara como resuelto'
                  : 'El evento se marcara como resuelto'
                : 'El evento volvera a mostrarse como activo'}
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButtonSecondary, { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' }]}
                onPress={() => setShowStatusConfirmModal(false)}
              >
                <Text style={[styles.deleteModalButtonSecondaryText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButtonPrimary, { backgroundColor: event?.status === 'IN_PROGRESS' ? '#34C759' : '#FF9500' }]}
                onPress={confirmToggleStatus}
              >
                <Text style={styles.deleteModalButtonPrimaryText}>
                  {event?.status === 'IN_PROGRESS' ? 'Cerrar' : 'Reabrir'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Comment Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable
          style={styles.deleteModalOverlay}
          onPress={() => setShowDeleteConfirm(false)}
        >
          <Pressable style={[styles.deleteModalContent, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="trash-outline" size={48} color={theme.error.main} />
            </View>
            <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Eliminar comentario?</Text>
            <Text style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
              Esta accion no se puede deshacer
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButtonSecondary, { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' }]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={[styles.deleteModalButtonSecondaryText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButtonPrimary, { backgroundColor: theme.error.main }]}
                onPress={confirmDeleteComment}
              >
                <Text style={styles.deleteModalButtonPrimaryText}>Eliminar</Text>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingTop: Platform.OS === 'ios' ? 50 : 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  headerButton: {
    padding: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  // User Header - Instagram style
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  userSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeBadgeSmallText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  closedBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  closedBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  userMenuButton: {
    padding: 8,
  },
  // Map
  mapContainer: {
    height: 220,
    width: '100%',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  trackingIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trackingIndicatorActive: {
    backgroundColor: '#34C759',
  },
  trackingIndicatorClosed: {
    backgroundColor: '#8E8E93',
  },
  trackingIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Interaction Bar
  interactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  interactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  interactionCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  interactionCountActive: {
    color: '#ed4956',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeBadgeText: {
    fontSize: 12,
  },
  statusToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Image
  eventImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  // Description
  descriptionContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  description: {
    fontSize: 15,
    color: '#262626',
    lineHeight: 22,
  },
  descriptionUserName: {
    fontWeight: '600',
  },
  // Device info
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  deviceText: {
    fontSize: 13,
    color: '#666',
  },
  // Comments Section
  commentsSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#efefef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 24,
  },
  commentsList: {
    gap: 16,
  },
  commentContainer: {
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
  },
  replyContainer: {
    marginLeft: 32,
    backgroundColor: '#fff',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  commentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  commentContent: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  replyButton: {
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  likeCountActive: {
    color: '#ed4956',
  },
  repliesContainer: {
    marginTop: 12,
    gap: 12,
  },
  // Fixed Input
  fixedInputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#efefef',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    fontSize: 15,
    color: '#262626',
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d0d0d0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },
  actionSheetButtonText: {
    fontSize: 16,
    color: '#262626',
    fontWeight: '500',
  },
  actionSheetButtonCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    justifyContent: 'center',
  },
  actionSheetButtonCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
  },
  deleteModalIcon: {
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  deleteModalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  deleteModalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  deleteModalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
