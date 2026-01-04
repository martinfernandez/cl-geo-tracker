import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { groupApi, Group, GroupMember, phoneLocationApi, api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useGroupStore } from '../store/useGroupStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  requestBackgroundPermissions,
} from '../services/backgroundLocation';
import ActionSheet, { ActionSheetOption } from '../components/ActionSheet';

export default function GroupDetailScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { showSuccess, showError } = useToast();
  const { setActiveGroup } = useGroupStore();
  const [group, setGroup] = useState<(Group & { members: GroupMember[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  const [showPermissionInfo, setShowPermissionInfo] = useState(false);

  useEffect(() => {
    loadGroup();
    loadCurrentUser();
  }, [groupId]);

  const loadCurrentUser = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    setCurrentUserId(userId);
  };

  const loadGroup = async () => {
    try {
      setLoading(true);
      const data = await groupApi.getById(groupId);
      setGroup(data);
      setLocationSharing(data.locationSharingEnabled || false);
    } catch (error) {
      console.error('Error loading group:', error);
      showError('No se pudo cargar el grupo');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLocationSharing = async (value: boolean) => {
    try {
      setLocationSharing(value);

      if (value) {
        // Request permissions and start background tracking
        const hasPermission = await requestBackgroundPermissions();
        if (!hasPermission) {
          setShowPermissionInfo(true);
          setLocationSharing(false);
          return;
        }

        // Ensure phone device exists
        try {
          await phoneLocationApi.createDevice();
        } catch (e) {
          // Device might already exist, continue
        }

        // Start background tracking
        const started = await startBackgroundTracking();
        if (!started) {
          showError('No se pudo iniciar el rastreo de ubicacion');
          setLocationSharing(false);
          return;
        }

        // Set phone device as active
        try {
          await phoneLocationApi.toggle(true);
        } catch (e) {
          console.log('Could not toggle phone device active:', e);
        }
      } else {
        // Stop background tracking
        await stopBackgroundTracking();

        // Set phone device as inactive
        try {
          await phoneLocationApi.toggle(false);
        } catch (e) {
          console.log('Could not toggle phone device inactive:', e);
        }
      }

      // Update group membership location sharing
      await groupApi.toggleLocationSharing(groupId, value);
      showSuccess(value ? 'Ubicacion activada' : 'Ubicacion desactivada');
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      setLocationSharing(!value);
      showError('No se pudo cambiar la configuracion');
    }
  };

  const handleViewOnMap = () => {
    if (group) {
      setActiveGroup(group);
      navigation.navigate('Main', { screen: 'Map' });
    }
  };

  const handleGroupChat = async () => {
    try {
      const conversation = await groupApi.getOrCreateGroupChat(groupId);
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        groupId,
        isGroupChat: true,
        groupName: group?.name,
      });
    } catch (error) {
      console.error('Error opening group chat:', error);
      showError('No se pudo abrir el chat del grupo');
    }
  };

  const handleMemberChat = async (member: GroupMember) => {
    try {
      // Create or get existing 1-to-1 conversation with this member
      const response = await api.post('/conversations', {
        otherUserId: member.userId,
      });
      const conversation = response.data;
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        otherUserId: member.userId,
      });
    } catch (error) {
      console.error('Error opening chat with member:', error);
      showError('No se pudo abrir el chat');
    }
  };

  const handleInvite = () => {
    navigation.navigate('GroupInvite', { groupId, groupName: group?.name });
  };

  const handleLeave = () => {
    if (!group) return;
    setShowLeaveConfirm(true);
  };

  const confirmLeave = async () => {
    setShowLeaveConfirm(false);
    try {
      await groupApi.leave(groupId);
      showSuccess('Has salido del grupo');
      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'No se pudo salir del grupo';
      showError(errorMessage);
    }
  };

  const handleDelete = () => {
    if (!group) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await groupApi.delete(groupId);
      showSuccess('Grupo eliminado');
      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'No se pudo eliminar el grupo';
      showError(errorMessage);
    }
  };

  const handleRemoveMember = (member: GroupMember) => {
    setSelectedMember(member);
    setShowMemberActions(false);
    setShowRemoveMemberConfirm(true);
  };

  const confirmRemoveMember = async () => {
    if (!selectedMember) return;
    setShowRemoveMemberConfirm(false);
    try {
      await groupApi.removeMember(groupId, selectedMember.userId);
      showSuccess('Miembro removido');
      setSelectedMember(null);
      loadGroup();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'No se pudo remover al miembro';
      showError(errorMessage);
    }
  };

  const handleToggleAdmin = async (member: GroupMember) => {
    const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    try {
      await groupApi.updateMemberRole(groupId, member.userId, newRole);
      showSuccess(newRole === 'ADMIN' ? 'Promovido a administrador' : 'Rol cambiado a miembro');
      loadGroup();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'No se pudo cambiar el rol';
      showError(errorMessage);
    }
  };

  if (loading || !group) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando grupo...</Text>
      </View>
    );
  }

  const isAdmin = group.userRole === 'ADMIN';
  const isCreator = group.creatorId === currentUserId;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grupo</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Group Info */}
        <View style={styles.groupHeader}>
          <View style={styles.groupIcon}>
            <Ionicons name="people" size={40} color="#007AFF" />
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description ? (
            <Text style={styles.groupDescription}>{group.description}</Text>
          ) : null}
          <View style={styles.roleContainer}>
            <View style={[styles.roleBadge, isAdmin && styles.adminRoleBadge]}>
              <Text style={styles.roleText}>
                {isAdmin ? 'Administrador' : 'Miembro'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={handleViewOnMap}
            activeOpacity={0.8}
          >
            <Ionicons name="map" size={22} color="#fff" />
            <Text style={styles.mapButtonText}>Ver en Mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleGroupChat}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles" size={22} color="#fff" />
            <Text style={styles.chatButtonText}>Chat del Grupo</Text>
          </TouchableOpacity>
        </View>

        {/* Location Sharing Toggle */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name={locationSharing ? 'location' : 'location-outline'}
                size={24}
                color={locationSharing ? '#34C759' : '#8E8E93'}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Compartir mi ubicación</Text>
                <Text style={styles.settingDescription}>
                  {locationSharing
                    ? 'Tu ubicación es visible para el grupo'
                    : 'Tu ubicación está oculta'}
                </Text>
              </View>
            </View>
            <Switch
              value={locationSharing}
              onValueChange={handleToggleLocationSharing}
              trackColor={{ false: '#E5E5E5', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Miembros ({group.members?.length || 0})
            </Text>
            {isAdmin ? (
              <TouchableOpacity onPress={handleInvite}>
                <Ionicons name="person-add" size={22} color="#007AFF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {group.members?.map((member) => {
            const isMemberCreator = member.userId === group.creatorId;
            const isSelf = member.userId === currentUserId;

            return (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Ionicons name="person-circle" size={44} color="#C7C7CC" />
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>
                      {member.user.name}
                      {isSelf ? ' (Tú)' : ''}
                    </Text>
                    {isMemberCreator ? (
                      <View style={styles.creatorBadge}>
                        <Text style={styles.creatorBadgeText}>Creador</Text>
                      </View>
                    ) : member.role === 'ADMIN' ? (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.memberEmail}>{member.user.email}</Text>
                  {member.locationSharingEnabled ? (
                    <View style={styles.sharingIndicator}>
                      <Ionicons name="location" size={12} color="#34C759" />
                      <Text style={styles.sharingText}>Compartiendo ubicación</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.memberActions}>
                  {/* Chat button - show for all members except self */}
                  {!isSelf && (
                    <TouchableOpacity
                      style={styles.memberChatButton}
                      onPress={() => handleMemberChat(member)}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  )}
                  {/* Admin actions button */}
                  {isAdmin && !isSelf && !isMemberCreator ? (
                    <TouchableOpacity
                      style={styles.memberAction}
                      onPress={() => {
                        setSelectedMember(member);
                        setShowMemberActions(true);
                      }}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {!isCreator ? (
            <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
              <Ionicons name="exit-outline" size={20} color="#FF3B30" />
              <Text style={styles.leaveButtonText}>Salir del grupo</Text>
            </TouchableOpacity>
          ) : null}

          {isCreator ? (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Eliminar grupo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* Member Actions Sheet */}
      <ActionSheet
        visible={showMemberActions}
        onClose={() => {
          setShowMemberActions(false);
          setSelectedMember(null);
        }}
        title={selectedMember?.user.name}
        options={
          selectedMember
            ? [
                {
                  label: selectedMember.role === 'ADMIN' ? 'Quitar Admin' : 'Hacer Admin',
                  icon: selectedMember.role === 'ADMIN' ? 'shield-outline' : 'shield-checkmark-outline',
                  onPress: () => handleToggleAdmin(selectedMember),
                },
                {
                  label: 'Remover del grupo',
                  icon: 'person-remove-outline',
                  onPress: () => handleRemoveMember(selectedMember),
                  destructive: true,
                },
              ]
            : []
        }
      />

      {/* Leave Group Confirmation Modal */}
      <Modal
        visible={showLeaveConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={[styles.confirmIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="exit-outline" size={32} color="#FF9500" />
            </View>
            <Text style={styles.confirmTitle}>Salir del Grupo</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro de que quieres salir de "{group?.name}"?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowLeaveConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmActionButton, { backgroundColor: '#FF9500' }]}
                onPress={confirmLeave}
              >
                <Text style={styles.confirmActionText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Group Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="trash" size={32} color="#FF3B30" />
            </View>
            <Text style={styles.confirmTitle}>Eliminar Grupo</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro de que quieres eliminar "{group?.name}"? Esta acción no se puede deshacer.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmActionButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmActionText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Member Confirmation Modal */}
      <Modal
        visible={showRemoveMemberConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveMemberConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="person-remove" size={32} color="#FF3B30" />
            </View>
            <Text style={styles.confirmTitle}>Remover Miembro</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro de que quieres remover a {selectedMember?.user.name} del grupo?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => {
                  setShowRemoveMemberConfirm(false);
                  setSelectedMember(null);
                }}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmActionButton}
                onPress={confirmRemoveMember}
              >
                <Text style={styles.confirmActionText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permission Info Modal */}
      <Modal
        visible={showPermissionInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionInfo(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={[styles.confirmIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="location" size={32} color="#007AFF" />
            </View>
            <Text style={styles.confirmTitle}>Permisos requeridos</Text>
            <Text style={styles.confirmMessage}>
              Para compartir tu ubicación, necesitas permitir el acceso a la ubicación en segundo plano. Por favor, habilita los permisos en la configuración de la app.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmCancelButton, { flex: 1 }]}
                onPress={() => setShowPermissionInfo(false)}
              >
                <Text style={[styles.confirmCancelText, { color: '#007AFF' }]}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  groupHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  roleContainer: {
    marginTop: 8,
  },
  roleBadge: {
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminRoleBadge: {
    backgroundColor: '#007AFF',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  mapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 12,
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#262626',
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  memberAvatar: {
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#262626',
  },
  memberEmail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  creatorBadge: {
    backgroundColor: '#FFD60A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#262626',
  },
  adminBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  sharingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sharingText: {
    fontSize: 12,
    color: '#34C759',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberChatButton: {
    padding: 8,
  },
  memberAction: {
    padding: 8,
  },
  actionsSection: {
    padding: 16,
    gap: 12,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  confirmActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
