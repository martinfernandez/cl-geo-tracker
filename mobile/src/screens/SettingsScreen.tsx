import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding, UserProfileType, TutorialType } from '../contexts/OnboardingContext';
import { useTheme } from '../contexts/ThemeContext';
import AreaOfInterestPicker from '../components/AreaOfInterestPicker';
import { api } from '../services/api';

const TUTORIAL_OPTIONS: Array<{
  type: UserProfileType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}> = [
  {
    type: 'tracker',
    icon: 'location',
    title: 'Rastreo de dispositivos',
    description: 'Aprende a proteger lo que importa',
    color: '#34C759',
  },
  {
    type: 'community',
    icon: 'people',
    title: 'Comunidad vecinal',
    description: 'Conecta con tu barrio',
    color: '#5856D6',
  },
  {
    type: 'business',
    icon: 'business',
    title: 'Gestion de flotas',
    description: 'Control de tu operacion',
    color: '#FF9500',
  },
  {
    type: 'explorer',
    icon: 'compass',
    title: 'Tour general',
    description: 'Conoce todas las funciones',
    color: '#8E8E93',
  },
];

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const navigation = useNavigation<any>();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { hasUnviewedTutorials, hasTutorialBeenViewed } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [areaOfInterest, setAreaOfInterest] = useState<{
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);

  // Privacy settings state
  const [showName, setShowName] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showPublicEvents, setShowPublicEvents] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      if (
        response.data.areaOfInterestLatitude &&
        response.data.areaOfInterestLongitude &&
        response.data.areaOfInterestRadius
      ) {
        setAreaOfInterest({
          latitude: response.data.areaOfInterestLatitude,
          longitude: response.data.areaOfInterestLongitude,
          radius: response.data.areaOfInterestRadius,
        });
      }

      // Load privacy settings
      setShowName(response.data.showName ?? true);
      setShowEmail(response.data.showEmail ?? false);
      setShowPublicEvents(response.data.showPublicEvents ?? true);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveArea = async (area: { latitude: number; longitude: number; radius: number }) => {
    setLoading(true);
    try {
      await api.put('/users/area-of-interest', area);
      setAreaOfInterest(area);
      Alert.alert('Exito', 'Area de interes actualizada');
    } catch (error: any) {
      console.error('Error saving area:', error);
      Alert.alert('Error', 'No se pudo guardar el area de interes');
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySetting = async (setting: string, value: boolean) => {
    try {
      await api.put('/users/privacy', { [setting]: value });
    } catch (error: any) {
      console.error('Error updating privacy setting:', error);
      Alert.alert('Error', 'No se pudo actualizar la configuracion de privacidad');
      // Revert the state on error
      if (setting === 'showName') setShowName(!value);
      if (setting === 'showEmail') setShowEmail(!value);
      if (setting === 'showPublicEvents') setShowPublicEvents(!value);
    }
  };

  const handleToggleShowName = async (value: boolean) => {
    setShowName(value);
    await updatePrivacySetting('showName', value);
  };

  const handleToggleShowEmail = async (value: boolean) => {
    setShowEmail(value);
    await updatePrivacySetting('showEmail', value);
  };

  const handleToggleShowPublicEvents = async (value: boolean) => {
    setShowPublicEvents(value);
    await updatePrivacySetting('showPublicEvents', value);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesion',
      'Estas seguro que deseas cerrar sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesion',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.secondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bg.primary, borderBottomColor: theme.glass.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Perfil</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.bg.primary, borderBottomColor: theme.glass.border }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: theme.primary.main }]}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <TouchableOpacity style={[styles.editAvatarButton, { backgroundColor: theme.secondary.main }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.userName, { color: theme.text.primary }]}>{user?.name || 'Usuario'}</Text>
          <Text style={[styles.userEmail, { color: theme.text.tertiary }]}>{user?.email}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.tertiary }]}>Cuenta</Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.primary }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.glass.border }]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.accent.subtle }]}>
                  <Ionicons name="person-outline" size={20} color={theme.accent.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Editar perfil</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Nombre, foto, informacion</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => setShowAreaPicker(true)}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.info.subtle }]}>
                  <Ionicons name="location-outline" size={20} color={theme.info.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Area de interes</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>
                    {areaOfInterest
                      ? `Radio: ${(areaOfInterest.radius / 1000).toFixed(1)} km`
                      : 'No configurada'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.tertiary }]}>Privacidad</Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.primary }]}>
            <View style={[styles.switchItem, { borderBottomColor: theme.glass.border }]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.warning.subtle }]}>
                  <Ionicons name="person-circle-outline" size={20} color={theme.warning.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Mostrar mi nombre</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Visible para otros usuarios</Text>
                </View>
              </View>
              <Switch
                value={showName}
                onValueChange={handleToggleShowName}
                trackColor={{ false: theme.glass.bgActive, true: theme.success.main }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchItem, { borderBottomColor: theme.glass.border }]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.primary.subtle }]}>
                  <Ionicons name="mail-outline" size={20} color={theme.primary.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Mostrar mi email</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Visible en tu perfil publico</Text>
                </View>
              </View>
              <Switch
                value={showEmail}
                onValueChange={handleToggleShowEmail}
                trackColor={{ false: theme.glass.bgActive, true: theme.success.main }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchItem, { borderBottomWidth: 0 }]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.tertiary.subtle }]}>
                  <Ionicons name="megaphone-outline" size={20} color={theme.tertiary.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Eventos publicos</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Mostrar en mi perfil</Text>
                </View>
              </View>
              <Switch
                value={showPublicEvents}
                onValueChange={handleToggleShowPublicEvents}
                trackColor={{ false: theme.glass.bgActive, true: theme.success.main }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.tertiary }]}>Apariencia</Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.primary }]}>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.glass.border }]}
              onPress={() => setThemeMode('system')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.primary.subtle }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color={theme.primary.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Seguir sistema</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Usa la configuracion del dispositivo</Text>
                </View>
              </View>
              {themeMode === 'system' && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary.main} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.glass.border }]}
              onPress={() => setThemeMode('light')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.warning.subtle }]}>
                  <Ionicons name="sunny-outline" size={20} color={theme.warning.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Modo claro</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Fondo blanco, texto oscuro</Text>
                </View>
              </View>
              {themeMode === 'light' && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary.main} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => setThemeMode('dark')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: isDark ? theme.glass.bgActive : '#263238' }]}>
                  <Ionicons name="moon-outline" size={20} color={isDark ? theme.secondary.light : '#B0BEC5'} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Modo oscuro</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Fondo oscuro, texto claro</Text>
                </View>
              </View>
              {themeMode === 'dark' && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary.main} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.tertiary }]}>General</Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.primary }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.glass.border }]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.warning.subtle }]}>
                  <Ionicons name="notifications-outline" size={20} color={theme.warning.dark} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Notificaciones</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Push, sonidos, alertas</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.glass.border }]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.primary.subtle }]}>
                  <Ionicons name="help-circle-outline" size={20} color={theme.primary.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Ayuda</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Centro de ayuda, contacto</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.secondary.subtle }]}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.secondary.main} />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>Acerca de</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>Version, terminos, licencias</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.disabled} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tutorials Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.text.tertiary }]}>Tutoriales</Text>
            {hasUnviewedTutorials && (
              <View style={[styles.newBadge, { backgroundColor: theme.error.main }]}>
                <Text style={styles.newBadgeText}>Nuevo</Text>
              </View>
            )}
          </View>

          {/* Tutorial Promo Banner - only show if user hasn't viewed any tutorials */}
          {hasUnviewedTutorials && (
            <View style={[styles.tutorialBanner, { backgroundColor: theme.primary.subtle }]}>
              <View style={styles.tutorialBannerIcon}>
                <Ionicons name="school" size={24} color={theme.primary.main} />
              </View>
              <View style={styles.tutorialBannerContent}>
                <Text style={[styles.tutorialBannerTitle, { color: theme.primary.dark }]}>
                  Aprende a sacar el maximo provecho
                </Text>
                <Text style={[styles.tutorialBannerSubtitle, { color: theme.primary.main }]}>
                  Descubre tutoriales personalizados segun tu uso
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.sectionCard, { backgroundColor: theme.bg.primary }]}>
            {TUTORIAL_OPTIONS.map((tutorial, index) => {
              const isViewed = hasTutorialBeenViewed(tutorial.type as TutorialType);
              return (
                <TouchableOpacity
                  key={tutorial.type}
                  style={[
                    styles.menuItem,
                    { borderBottomColor: theme.glass.border },
                    index === TUTORIAL_OPTIONS.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => navigation.navigate('TutorialViewer', { tutorialType: tutorial.type })}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIcon, { backgroundColor: `${tutorial.color}15` }]}>
                      <Ionicons name={tutorial.icon} size={20} color={tutorial.color} />
                    </View>
                    <View style={styles.menuItemTextContainer}>
                      <View style={styles.tutorialTitleRow}>
                        <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>{tutorial.title}</Text>
                        {!isViewed && (
                          <View style={[styles.tutorialDot, { backgroundColor: theme.error.main }]} />
                        )}
                      </View>
                      <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>{tutorial.description}</Text>
                    </View>
                  </View>
                  {isViewed ? (
                    <Ionicons name="checkmark-circle" size={24} color={theme.success.main} />
                  ) : (
                    <Ionicons name="play-circle" size={24} color={tutorial.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.bg.primary }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.error.main} />
            <Text style={[styles.logoutButtonText, { color: theme.error.main }]}>Cerrar Sesion</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={[styles.versionText, { color: theme.text.disabled }]}>Version 1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AreaOfInterestPicker
        visible={showAreaPicker}
        onClose={() => setShowAreaPicker(false)}
        onSave={handleSaveArea}
        initialArea={areaOfInterest || undefined}
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
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
    gap: 8,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  tutorialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  tutorialBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tutorialBannerContent: {
    flex: 1,
  },
  tutorialBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  tutorialBannerSubtitle: {
    fontSize: 13,
  },
  tutorialTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tutorialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
