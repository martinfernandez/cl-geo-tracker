import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { areaApi, AreaOfInterest, AreaMember, AreaInvitation, api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../contexts/ToastContext';
import { useMapStore } from '../store/useMapStore';
import { useTheme } from '../contexts/ThemeContext';

export default function AreaDetailScreen({ route, navigation }: any) {
  const { areaId } = route.params;
  const { showSuccess, showError } = useToast();
  const { isDark } = useTheme();
  const [area, setArea] = useState<AreaOfInterest | null>(null);
  const [members, setMembers] = useState<AreaMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<AreaInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadAreaDetails();
    loadCurrentUser();
  }, [areaId]);

  const loadCurrentUser = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    setCurrentUserId(userId);
  };

  const loadAreaDetails = async () => {
    try {
      setLoading(true);
      const areaData = await areaApi.getById(areaId);
      setArea(areaData);

      // Load membership info (including notification settings)
      try {
        const membershipData = await api.get(`/areas/${areaId}/membership`);
        setNotificationsEnabled(membershipData.data.notificationsEnabled);
      } catch (error) {
        console.error('Error loading membership:', error);
      }

      // Mark area as seen (reset newEventsCount)
      try {
        await api.post(`/areas/${areaId}/seen`);
      } catch (error) {
        console.error('Error marking area as seen:', error);
      }

      // Load join requests if user is admin
      if (areaData.userRole === 'ADMIN') {
        const requests = await areaApi.getAreaRequests(areaId);
        setJoinRequests(requests);
      }
    } catch (error) {
      console.error('Error loading area details:', error);
      Alert.alert('Error', 'No se pudo cargar el área');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      await api.put(`/areas/${areaId}/notifications`, { enabled: value });
      showSuccess(value ? 'Notificaciones activadas' : 'Notificaciones silenciadas');
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setNotificationsEnabled(!value); // Revert on error
      showError('No se pudo cambiar la configuración');
    }
  };

  const handleLeave = () => {
    if (!area) return;
    setShowLeaveConfirm(true);
  };

  const confirmLeave = async () => {
    setShowLeaveConfirm(false);
    try {
      await areaApi.leave(areaId);
      showSuccess('Has salido del área');
      navigation.goBack();
    } catch (error) {
      console.error('Error leaving area:', error);
      showError('No se pudo salir del área');
    }
  };

  const handleDelete = () => {
    if (!area) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await areaApi.delete(areaId);
      showSuccess('Área eliminada correctamente');
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting area:', error);
      showError('No se pudo eliminar el área');
    }
  };

  const handleAcceptRequest = async (invitationId: string) => {
    try {
      // Encontrar la solicitud para obtener los datos del usuario
      const request = joinRequests.find((r) => r.id === invitationId);

      await areaApi.acceptInvitation(invitationId);

      if (request && area) {
        console.log(
          `✅ Usuario ${request.sender?.name} aceptado en "${area.name}"`
        );
      }

      showSuccess('Solicitud aceptada');
      loadAreaDetails();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      const errorMessage = error.response?.data?.error || 'No se pudo aceptar la solicitud';
      showError(errorMessage);
    }
  };

  const handleRejectRequest = async (invitationId: string) => {
    try {
      await areaApi.rejectInvitation(invitationId);
      showSuccess('Solicitud rechazada');
      loadAreaDetails();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      const errorMessage = error.response?.data?.error || 'No se pudo rechazar la solicitud';
      showError(errorMessage);
    }
  };

  const handleViewOnMap = () => {
    if (!area) return;

    // Set the pending center area in the store
    useMapStore.getState().setPendingCenterArea({
      latitude: area.latitude,
      longitude: area.longitude,
      radius: area.radius,
      name: area.name,
    });
    // Navigate to the Map tab
    navigation.navigate('Main', { screen: 'Map' });
  };

  if (loading || !area) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando área...</Text>
      </View>
    );
  }

  const visibilityLabels = {
    PUBLIC: 'Pública',
    PRIVATE_SHAREABLE: 'Privada (Compartible)',
    PRIVATE: 'Privada',
  };

  const visibilityColors = {
    PUBLIC: '#34C759',
    PRIVATE_SHAREABLE: '#FF9500',
    PRIVATE: '#8E8E93',
  };

  const isAdmin = area.userRole === 'ADMIN';
  const isCreator = area.creatorId === currentUserId;

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
        <Text style={styles.headerTitle}>Detalle del Área</Text>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => setShowActionSheet(true)}
            style={styles.headerButton}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#262626" />
          </TouchableOpacity>
        )}
        {!isAdmin && <View style={styles.headerSpacer} />}
      </View>

      <ScrollView style={styles.content}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: area.latitude,
              longitude: area.longitude,
              latitudeDelta: (area.radius / 111000) * 4,
              longitudeDelta: (area.radius / 111000) * 4,
            }}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            <Marker
              coordinate={{
                latitude: area.latitude,
                longitude: area.longitude,
              }}
            >
              <View style={styles.centerMarker}>
                <Ionicons name="location" size={32} color="#007AFF" />
              </View>
            </Marker>
            <Circle
              center={{
                latitude: area.latitude,
                longitude: area.longitude,
              }}
              radius={area.radius}
              strokeColor="rgba(0, 122, 255, 0.5)"
              fillColor="rgba(0, 122, 255, 0.1)"
              strokeWidth={2}
            />
          </MapView>
          <TouchableOpacity
            style={styles.viewOnMapButton}
            onPress={handleViewOnMap}
            activeOpacity={0.8}
          >
            <Ionicons name="expand" size={18} color="#fff" />
            <Text style={styles.viewOnMapButtonText}>Ver en Mapa</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.areaName}>{area.name}</Text>
            <View
              style={[
                styles.visibilityBadge,
                { backgroundColor: visibilityColors[area.visibility] },
              ]}
            >
              <Text style={styles.visibilityText}>
                {visibilityLabels[area.visibility]}
              </Text>
            </View>
          </View>

          {area.description && (
            <Text style={styles.description}>{area.description}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color="#666" />
              <Text style={styles.statText}>{area.memberCount} miembros</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="radio" size={20} color="#666" />
              <Text style={styles.statText}>{(area.radius / 1000).toFixed(1)} km</Text>
            </View>
          </View>

          <View style={styles.creatorRow}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.creatorText}>
              Creado por {area.creator.name}
            </Text>
          </View>

          {area.userRole && (
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Tu rol:</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {area.userRole === 'ADMIN' ? 'Administrador' : 'Miembro'}
                </Text>
              </View>
            </View>
          )}

          {/* Notifications Toggle */}
          {area.isMember && (
            <View style={styles.notificationContainer}>
              <View style={styles.notificationInfo}>
                <Ionicons
                  name={notificationsEnabled ? 'notifications' : 'notifications-off'}
                  size={22}
                  color={notificationsEnabled ? '#007AFF' : '#8E8E93'}
                />
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationLabel}>Notificaciones</Text>
                  <Text style={styles.notificationDescription}>
                    {notificationsEnabled
                      ? 'Recibirás alertas de nuevos eventos en esta área'
                      : 'Las notificaciones están silenciadas'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E5E5E5', true: '#34C759' }}
                thumbColor="#fff"
              />
            </View>
          )}
        </View>

        {/* Join Requests (Admin only) */}
        {isAdmin && joinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Solicitudes Pendientes</Text>
            {joinRequests.map((request) => {
              const requestDate = new Date(request.createdAt);
              const formattedDate = requestDate.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const formattedTime = requestDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestInfo}>
                    <Ionicons name="person-circle" size={48} color="#007AFF" />
                    <View style={styles.requestDetails}>
                      <Text style={styles.requestName}>
                        {request.sender?.name || 'Usuario desconocido'}
                      </Text>
                      <Text style={styles.requestEmail}>
                        {request.sender?.email}
                      </Text>
                      <Text style={styles.requestDate}>
                        {formattedDate} • {formattedTime}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(request.id)}
                    >
                      <Ionicons name="checkmark" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.rejectButton]}
                      onPress={() => handleRejectRequest(request.id)}
                    >
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Leave Button */}
        {!isCreator && area.isMember && (
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
            <Ionicons name="exit-outline" size={20} color="#FF3B30" />
            <Text style={styles.leaveButtonText}>Salir del Área</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
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
              style={styles.actionSheetItem}
              onPress={() => {
                setShowActionSheet(false);
                // Navigate to edit screen when implemented
                Alert.alert('Próximamente', 'Función de edición en desarrollo');
              }}
            >
              <Ionicons name="pencil" size={24} color="#007AFF" />
              <Text style={styles.actionSheetItemText}>Editar Área</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetItem, styles.actionSheetItemDanger]}
              onPress={() => {
                setShowActionSheet(false);
                handleDelete();
              }}
            >
              <Ionicons name="trash" size={24} color="#FF3B30" />
              <Text style={styles.actionSheetItemTextDanger}>Eliminar Área</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSheetCancel}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={styles.actionSheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
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
            <Text style={styles.confirmTitle}>Eliminar Área</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro de que quieres eliminar "{area?.name}"? Esta acción no se puede deshacer.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leave Confirmation Modal */}
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
            <Text style={styles.confirmTitle}>Salir del Área</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro de que quieres salir de "{area?.name}"?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowLeaveConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteButton, { backgroundColor: '#FF9500' }]}
                onPress={confirmLeave}
              >
                <Text style={styles.confirmDeleteText}>Salir</Text>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  headerSpacer: {
    width: 40,
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
  mapContainer: {
    height: 250,
    backgroundColor: '#e0e0e0',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  viewOnMapButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  viewOnMapButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  areaName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#262626',
    marginRight: 12,
  },
  visibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visibilityText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 15,
    color: '#666',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  creatorText: {
    fontSize: 14,
    color: '#666',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  roleLabel: {
    fontSize: 15,
    color: '#666',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  roleText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  requestDetails: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  requestUsername: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  requestEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#f8f8f8',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#c7c7c7',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginBottom: 1,
  },
  actionSheetItemText: {
    fontSize: 17,
    color: '#007AFF',
  },
  actionSheetItemDanger: {
    marginBottom: 8,
  },
  actionSheetItemTextDanger: {
    fontSize: 17,
    color: '#FF3B30',
  },
  actionSheetCancel: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 8,
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
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
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
