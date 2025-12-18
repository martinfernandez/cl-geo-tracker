import React, { useState, useEffect } from 'react';
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
  Alert,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { eventApi, reactionApi, commentApi, Comment, api } from '../services/api';

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
      Alert.alert('Error', 'No se pudo cargar el evento');
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
      Alert.alert('Error', 'No se pudo actualizar la reacción');
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
      Alert.alert('Error', 'No se pudo enviar el comentario');
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
      Alert.alert(
        'Éxito',
        newStatus === 'CLOSED' ? 'Evento cerrado correctamente' : 'Evento reabierto correctamente'
      );
    } catch (error) {
      console.error('Error toggling event status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del evento');
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
      Alert.alert('Error', 'No se pudo actualizar el like');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Eliminar comentario',
      '¿Estás seguro que quieres eliminar este comentario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await commentApi.deleteComment(commentId);
              await loadEventDetails();
              Alert.alert('Éxito', 'Comentario eliminado');
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'No se pudo eliminar el comentario');
            }
          },
        },
      ]
    );
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
          <Text style={styles.commentAuthor}>{comment.user.name}</Text>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                strokeColor="#FF3B30"
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
            <Text style={styles.metadataText}>
              Reportado por: {event.user.name}
            </Text>
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
              source={{ uri: `http://192.168.0.69:3000${event.imageUrl}` }}
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

            <View style={styles.interactionButton}>
              <Ionicons name="chatbubble-outline" size={28} color="#262626" />
              <Text style={styles.interactionCount}>
                {comments.length || 0}
              </Text>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comentarios</Text>

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
                style={styles.commentInput}
                placeholder={
                  replyingTo ? 'Escribe una respuesta...' : 'Escribe un comentario...'
                }
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
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
        </View>
      </ScrollView>

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
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
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
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    color: '#262626',
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
});
