import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserAvatar from '../components/UserAvatar';
import { api } from '../services/api';
import { processImageForUpload } from '../utils/imageUtils';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track original values to detect changes
  const [originalName, setOriginalName] = useState(user?.name || '');
  const [originalBio, setOriginalBio] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Check if there are unsaved changes
    const changed = name !== originalName || bio !== originalBio || phone !== originalPhone;
    setHasChanges(changed);
  }, [name, bio, phone, originalName, originalBio, originalPhone]);

  const loadProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      const data = response.data;

      setName(data.name || '');
      setBio(data.bio || '');
      setPhone(data.phone || '');

      setOriginalName(data.name || '');
      setOriginalBio(data.bio || '');
      setOriginalPhone(data.phone || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a las fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Se necesita permiso para usar la camara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);

      const processed = await processImageForUpload(uri, 'AVATAR');

      const formData = new FormData();
      formData.append('image', {
        uri: processed.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      const response = await api.put('/users/profile/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUser({ imageUrl: response.data.imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Cambiar foto de perfil',
      'Elige una opcion',
      [
        { text: 'Tomar foto', onPress: handleTakePhoto },
        { text: 'Elegir de galeria', onPress: handlePickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    setLoading(true);
    try {
      await api.put('/users/profile', {
        name: name.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
      });

      updateUser({ name: name.trim() });

      setOriginalName(name.trim());
      setOriginalBio(bio.trim());
      setOriginalPhone(phone.trim());
      setHasChanges(false);

      Alert.alert('Exito', 'Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Cambios sin guardar',
        'Tienes cambios sin guardar. ¿Deseas descartarlos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* Header */}
      <View style={[
        styles.header,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
          paddingTop: insets.top + 8,
        }
      ]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Editar perfil</Text>
        <TouchableOpacity
          style={[styles.headerButton, !hasChanges && styles.headerButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary.main} />
          ) : (
            <Ionicons
              name="checkmark"
              size={24}
              color={hasChanges ? theme.primary.main : theme.textDisabled}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Picture Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={showImageOptions}
            disabled={uploadingImage}
            activeOpacity={0.8}
          >
            <UserAvatar
              imageUrl={user?.imageUrl}
              name={user?.name}
              size={100}
            />
            {uploadingImage ? (
              <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : (
              <View style={[styles.editAvatarBadge, { backgroundColor: theme.primary.main }]}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={showImageOptions} disabled={uploadingImage}>
            <Text style={[styles.changePhotoText, { color: theme.primary.main }]}>
              Cambiar foto de perfil
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Nombre</Text>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                borderColor: theme.border,
              }
            ]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {name.length > 0 && (
                <TouchableOpacity onPress={() => setName('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bio Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bio</Text>
            <View style={[
              styles.inputContainer,
              styles.bioInputContainer,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                borderColor: theme.border,
              }
            ]}>
              <TextInput
                style={[styles.input, styles.bioInput, { color: theme.text }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Escribe algo sobre ti..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={3}
                maxLength={150}
                textAlignVertical="top"
              />
            </View>
            <Text style={[styles.charCount, { color: theme.textTertiary }]}>
              {bio.length}/150
            </Text>
          </View>

          {/* Phone Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Telefono</Text>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                borderColor: theme.border,
              }
            ]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+54 11 1234-5678"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
              {phone.length > 0 && (
                <TouchableOpacity onPress={() => setPhone('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA',
                borderColor: theme.border,
              }
            ]}>
              <TextInput
                style={[styles.input, { color: theme.textTertiary }]}
                value={user?.email || ''}
                editable={false}
              />
              <Ionicons name="lock-closed" size={18} color={theme.textTertiary} />
            </View>
            <Text style={[styles.fieldHint, { color: theme.textTertiary }]}>
              El email no se puede cambiar
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Tu informacion de perfil es visible para otros usuarios segun tu configuracion de privacidad.
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarBadge: {
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
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  bioInputContainer: {
    alignItems: 'flex-start',
    minHeight: 80,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  bioInput: {
    minHeight: 60,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginRight: 4,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
