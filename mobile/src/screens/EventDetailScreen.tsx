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
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { eventApi, reactionApi, commentApi, Comment, api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { BASE_URL } from '../config/environment';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params: { eventId: string } }, 'params'>;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  THEFT: 'Robo',
  LOST: 'Extravío',
  ACCIDENT: 'Accidente',
  FIRE: 'Incendio',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  THEFT: '#FF3B30',
  LOST: '#FF9500',
  ACCIDENT: '#FFCC00',
  FIRE: '#FF2D55',
};

export default function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { showSuccess, showError } = useToast();
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [eventConversations, setEventConversations] = useState<any[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);

  const handleScrollToComments = () => {
    // Scroll to bottom and focus the comment input
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 300);
  };

  useEffect(() => {
    loadEventDetails();
    loadCurrentUser();
  }, [eventId]);

  const loadCurrentUser = async () => {
    try {
      const response = await api.get('/users/profile');
      setCurrentUserId(response.data.id);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  // Load conversations for event owner
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

  // Load conversations when event and currentUserId are available
  useEffect(() => {
    if (event && currentUserId && event.userId === currentUserId && event.isUrgent) {
      loadEventConversations();
    }
  }, [event?.id, currentUserId]);

  useEffect(() => {
    if (event?.realTimeTracking && event?.status === 'IN_PROGRESS') {
      loadTrackedPositions();
      // Poll every 30 seconds while event is active
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
      showError('No se pudo actualizar la reacción');
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
      // If only one conversation, go directly to chat
      const conv = eventConversations[0];
      navigation.navigate('Chat' as never, {
        conversationId: conv.id,
        eventId: event.id,
        otherUserId: conv.otherUser?.id,
      } as never);
    } else {
      // If multiple conversations, go to inbox filtered by event
      navigation.navigate('Inbox' as never, { eventId: event.id } as never);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      await commentApi.createComment(eventId, {
        content: commentText.trim(),
        parentCommentId: replyingTo || undefined,
      });
      setCommentText('');
      setReplyingTo(null);
      await loadEventDetails();
    } catch (error) {
      console.error('Error submitting comment:', error);
      showError('No se pudo enviar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = event.status === 'IN_PROGRESS' ? 'CLOSED' : 'IN_PROGRESS';
      await eventApi.update(eventId, { status: newStatus });
      setEvent((prev: any) => ({ ...prev, status: newStatus }));
      setShowActionSheet(false);
      showSuccess(
        newStatus === 'CLOSED' ? 'Evento cerrado correctamente' : 'Evento reabierto correctamente'
      );
    } catch (error) {
      console.error('Error toggling event status:', error);
      showError('No se pudo actualizar el estado del evento');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const result = await commentApi.toggleCommentLike(commentId);
      // Update local state to reflect the like change
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === commentId) {
            const userLike = comment.likes?.find((like) => like.userId === currentUserId);
            return {
              ...comment,
              likes: result.liked
                ? [...(comment.likes || []), { id: Date.now().toString(), userId: currentUserId!, createdAt: new Date().toISOString() }]
                : comment.likes?.filter((like) => like.userId !== currentUserId) || [],
            };
          }
          // Handle likes in replies
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) => {
                if (reply.id === commentId) {
                  const userLike = reply.likes?.find((like) => like.userId === currentUserId);
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

  const renderComment = (comment: Comment, isReply = false) => {
    const likeCount = comment.likes?.length || 0;
    const userLiked = comment.likes?.some((like) => like.userId === currentUserId);
    const isOwnComment = comment.user.id === currentUserId;

    return (
      <View
        key={comment.id}
        style={[styles.commentContainer, isReply && styles.replyContainer]}
      >
        <View style={styles.commentHeader}>
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile' as never, { userId: comment.user.id } as never)}>
            <Text style={styles.commentAuthor}>{comment.user.name}</Text>
          </TouchableOpacity>
          <View style={styles.commentHeaderRight}>
            <Text style={styles.commentDate}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </Text>
            {isOwnComment && (
              <TouchableOpacity
                onPress={() => handleDeleteComment(comment.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.commentContent}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={() => setReplyingTo(comment.id)}
            style={styles.replyButton}
          >
            <Text style={styles.replyButtonText}>Responder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCommentLike(comment.id)}
            style={styles.likeButton}
          >
            <Ionicons
              name={userLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={userLiked ? '#ed4956' : '#666'}
            />
            {likeCount > 0 && (
              <Text style={[styles.likeCount, userLiked && styles.likeCountActive]}>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudo cargar el evento</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Evento</Text>
        {currentUserId && event?.userId === currentUserId ? (
          <TouchableOpacity
            onPress={() => setShowActionSheet(true)}
            style={styles.headerButton}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#262626" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: event.latitude,
              longitude: event.longitude,
              latitudeDelta: trackedPositions.length > 0 ? 0.02 : 0.01,
              longitudeDelta: trackedPositions.length > 0 ? 0.02 : 0.01,
            }}
          >
            {/* Event start marker */}
            <Marker
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              pinColor={EVENT_TYPE_COLORS[event.type]}
              title="Inicio del evento"
            />

            {/* Tracked route polyline */}
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

            {/* Current position marker (last position) */}
            {event.realTimeTracking && trackedPositions.length > 0 && (
              <Marker
                coordinate={trackedPositions[trackedPositions.length - 1]}
                pinColor="#007AFF"
                title="Posición actual"
              />
            )}
          </MapView>

          {/* Real-time tracking indicator */}
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
                  ? `Rastreo activo • ${trackedPositions.length} posiciones`
                  : `Rastreo finalizado • ${trackedPositions.length} posiciones`}
              </Text>
            </View>
          )}
        </View>

        {/* Event Info */}
        <View style={styles.infoContainer}>
          <View style={styles.badges}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: EVENT_TYPE_COLORS[event.type] },
              ]}
            >
              <Text style={styles.badgeText}>
                {EVENT_TYPE_LABELS[event.type]}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                event.status === 'CLOSED' && styles.statusBadgeClosed,
              ]}
            >
              <Text style={styles.badgeText}>
                {event.status === 'IN_PROGRESS' ? 'En Progreso' : 'Cerrado'}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.metadata}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataText}>Reportado por: </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('UserProfile' as never, { userId: event.user.id } as never)}
              >
                <Text style={styles.userName}>{event.user.name}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.metadataText}>
              {new Date(event.createdAt).toLocaleString()}
            </Text>
            {event.device && (
              <Text style={styles.metadataText}>
                Dispositivo: {event.device.name || event.device.imei}
              </Text>
            )}
          </View>

          {/* Image */}
          {event.imageUrl && (
            <Image
              source={{ uri: `${BASE_URL}${event.imageUrl}` }}
              style={styles.eventImage}
            />
          )}

          {/* Interactions */}
          <View style={styles.interactionBar}>
            <TouchableOpacity
              style={styles.interactionButton}
              onPress={handleReaction}
            >
              <Ionicons
                name={event.userReacted ? 'heart' : 'heart-outline'}
                size={28}
                color={event.userReacted ? '#ed4956' : '#262626'}
              />
              <Text style={styles.interactionCount}>
                {event.reactionCount || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.interactionButton}
              onPress={handleScrollToComments}
            >
              <Ionicons name="chatbubble-outline" size={28} color="#262626" />
              <Text style={styles.interactionCount}>
                {comments.length || 0}
              </Text>
            </TouchableOpacity>

            {/* Chat button for non-owners of urgent events */}
            {event.isUrgent && event.userId !== currentUserId && (
              <TouchableOpacity
                style={styles.interactionButton}
                onPress={handleOpenChat}
              >
                <Ionicons name="chatbubbles" size={28} color="#007AFF" />
              </TouchableOpacity>
            )}

            {/* Chat/Inbox button for event owner when they have messages */}
            {event.isUrgent && event.userId === currentUserId && eventConversations.length > 0 && (
              <TouchableOpacity
                style={styles.interactionButton}
                onPress={handleOpenEventInbox}
              >
                <View>
                  <Ionicons name="chatbubbles" size={28} color="#007AFF" />
                  {unreadMessageCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.interactionCount}>
                  {eventConversations.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comentarios</Text>

            {comments.length === 0 ? (
              <Text style={styles.noCommentsText}>
                No hay comentarios aún. ¡Sé el primero en comentar!
              </Text>
            ) : (
              <View style={styles.commentsList}>
                {comments.map((comment) => renderComment(comment))}
              </View>
            )}
          </View>
          {/* Extra padding for fixed input */}
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Fixed Comment Input at Bottom */}
      <View style={styles.fixedInputContainer}>
        {replyingTo && (
          <View style={styles.replyingToBar}>
            <Text style={styles.replyingToText}>
              Respondiendo a un comentario
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.commentInputContainer}>
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder={
              replyingTo ? 'Escribe una respuesta...' : 'Escribe un comentario...'
            }
            placeholderTextColor="#8E8E93"
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
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="send" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Sheet Modal */}
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
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHandle} />

            <TouchableOpacity
              style={styles.actionSheetButton}
              onPress={handleToggleStatus}
            >
              <Ionicons
                name={event?.status === 'IN_PROGRESS' ? 'checkmark-circle-outline' : 'play-circle-outline'}
                size={24}
                color="#262626"
              />
              <Text style={styles.actionSheetButtonText}>
                {event?.status === 'IN_PROGRESS' ? 'Cerrar evento' : 'Reabrir evento'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetButton, styles.actionSheetButtonCancel]}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={styles.actionSheetButtonCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
          <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="trash-outline" size={48} color="#FF3B30" />
            </View>
            <Text style={styles.deleteModalTitle}>Eliminar comentario?</Text>
            <Text style={styles.deleteModalMessage}>
              Esta accion no se puede deshacer
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalButtonSecondary}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.deleteModalButtonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalButtonPrimary}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  headerSpacer: {
    width: 40,
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
  mapContainer: {
    height: 250,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    padding: 16,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF9500',
  },
  statusBadgeClosed: {
    backgroundColor: '#34C759',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#262626',
    marginBottom: 16,
    lineHeight: 22,
  },
  metadata: {
    gap: 6,
    marginBottom: 16,
  },
  metadataText: {
    fontSize: 13,
    color: '#666',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  eventImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  interactionBar: {
    flexDirection: 'row',
    gap: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#efefef',
    marginBottom: 24,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interactionCount: {
    fontSize: 16,
    color: '#262626',
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 8,
    paddingBottom: 16,
  },
  fixedInputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 16,
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
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
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
  noCommentsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 32,
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
  trackingIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
