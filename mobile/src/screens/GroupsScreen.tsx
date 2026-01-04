import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { groupApi, Group, GroupInvitation } from '../services/api';
import { useGroupStore } from '../store/useGroupStore';
import { useToast } from '../contexts/ToastContext';
import { ObjectsPatternBackground } from '../components/ObjectsPatternBackground';

type TabType = 'groups' | 'invitations';

export default function GroupsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const { setActiveGroup } = useGroupStore();
  const { showSuccess, showError } = useToast();

  const loadGroups = async () => {
    try {
      const data = await groupApi.getMyGroups();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      const data = await groupApi.getMyInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const loadData = async () => {
    try {
      await Promise.all([loadGroups(), loadInvitations()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupDetail', { groupId: group.id });
  };

  const handleViewOnMap = (group: Group) => {
    setActiveGroup(group);
    navigation.navigate('Map');
  };

  const handleAcceptInvitation = async (invitation: GroupInvitation) => {
    try {
      setProcessingInvitation(invitation.id);
      const result = await groupApi.acceptInvitation(invitation.id);
      showSuccess(`Te uniste a "${result.groupName}"`);
      // Refresh both lists
      await loadData();
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      const errorMessage = error.response?.data?.error || 'No se pudo aceptar la invitacion';
      showError(errorMessage);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (invitation: GroupInvitation) => {
    try {
      setProcessingInvitation(invitation.id);
      await groupApi.rejectInvitation(invitation.id);
      showSuccess('Invitacion rechazada');
      // Remove from list
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      const errorMessage = error.response?.data?.error || 'No se pudo rechazar la invitacion';
      showError(errorMessage);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const renderGroupItem = ({ item }: { item: Group }) => {
    const isAdmin = item.userRole === 'ADMIN';

    return (
      <View style={styles.groupCard}>
        <TouchableOpacity
          style={styles.groupCardContent}
          onPress={() => handleGroupPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.groupIcon}>
            <Ionicons name="people" size={28} color="#007AFF" />
          </View>
          <View style={styles.groupInfo}>
            <View style={styles.groupNameRow}>
              <Text style={styles.groupName} numberOfLines={1}>
                {item.name}
              </Text>
              {isAdmin ? (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              ) : null}
            </View>
            {item.description ? (
              <Text style={styles.groupDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.groupStats}>
              <Ionicons name="person" size={14} color="#8E8E93" />
              <Text style={styles.statsText}>{item.memberCount} miembros</Text>
              {item.locationSharingEnabled ? (
                <>
                  <View style={styles.statDot} />
                  <Ionicons name="location" size={14} color="#34C759" />
                  <Text style={[styles.statsText, { color: '#34C759' }]}>
                    Compartiendo
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewMapButton}
          onPress={() => handleViewOnMap(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="map" size={18} color="#fff" />
          <Text style={styles.viewMapButtonText}>Ver en Mapa</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInvitationItem = ({ item }: { item: GroupInvitation }) => {
    const isProcessing = processingInvitation === item.id;

    return (
      <View style={styles.invitationCard}>
        <View style={styles.invitationHeader}>
          <View style={styles.invitationIcon}>
            <Ionicons name="people" size={24} color="#007AFF" />
          </View>
          <View style={styles.invitationInfo}>
            <Text style={styles.invitationGroupName}>{item.group.name}</Text>
            <Text style={styles.invitationSender}>
              Invitado por {item.sender?.name || 'Usuario'}
            </Text>
            {item.group.description ? (
              <Text style={styles.invitationDescription} numberOfLines={2}>
                {item.group.description}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.invitationActions}>
          <TouchableOpacity
            style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleRejectInvitation(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleAcceptInvitation(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>Aceptar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* SVG Background Pattern with Objects */}
      <ObjectsPatternBackground />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Grupos</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateGroup')}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            Mis Grupos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invitations' && styles.activeTab]}
          onPress={() => setActiveTab('invitations')}
        >
          <Text style={[styles.tabText, activeTab === 'invitations' && styles.activeTabText]}>
            Invitaciones
          </Text>
          {invitations.length > 0 && (
            <View style={styles.invitationBadge}>
              <Text style={styles.invitationBadgeText}>
                {invitations.length > 99 ? '99+' : invitations.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'groups' ? (
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No tienes grupos</Text>
              <Text style={styles.emptyText}>
                Crea un grupo para compartir ubicaciones y dispositivos con tu familia o amigos
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Crear Grupo</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Sin invitaciones</Text>
              <Text style={styles.emptyText}>
                Cuando alguien te invite a un grupo, aparecera aqui
              </Text>
            </View>
          }
        />
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#262626',
  },
  headerButton: {
    padding: 8,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  activeTab: {
    borderBottomColor: '#262626',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#262626',
  },
  invitationBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  groupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
    marginRight: 8,
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
    flexShrink: 1,
  },
  adminBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 2,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#C7C7CC',
    marginHorizontal: 6,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
  },
  viewMapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  invitationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  invitationHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  invitationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationGroupName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  invitationSender: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  invitationDescription: {
    fontSize: 14,
    color: '#666',
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
