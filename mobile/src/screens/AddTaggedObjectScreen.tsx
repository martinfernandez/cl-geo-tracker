import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceApi } from '../services/api';
import { BASE_URL } from '../config/environment';
import { useDeviceStore } from '../store/useDeviceStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import QRCode from 'react-native-qrcode-svg';

// Color palette for tagged objects
const OBJECT_COLORS = [
  { id: 'orange', color: '#FF9500', name: 'Naranja' },
  { id: 'purple', color: '#AF52DE', name: 'Purpura' },
  { id: 'green', color: '#34C759', name: 'Verde' },
  { id: 'blue', color: '#007AFF', name: 'Azul' },
  { id: 'pink', color: '#FF2D55', name: 'Rosa' },
  { id: 'teal', color: '#5AC8FA', name: 'Celeste' },
  { id: 'red', color: '#FF3B30', name: 'Rojo' },
  { id: 'yellow', color: '#FFCC00', name: 'Amarillo' },
];

interface ColorDotProps {
  color: string;
  selected: boolean;
  onPress: () => void;
}

const ColorDot = ({ color, selected, onPress }: ColorDotProps) => (
  <TouchableOpacity
    style={[
      styles.colorDot,
      { backgroundColor: color },
      selected && styles.colorDotSelected,
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {selected && <Ionicons name="checkmark" size={18} color="#fff" />}
  </TouchableOpacity>
);

export function AddTaggedObjectScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(OBJECT_COLORS[0].color);
  const [loading, setLoading] = useState(false);
  const [createdDevice, setCreatedDevice] = useState<any>(null);
  const { addDevice } = useDeviceStore();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const handleAddObject = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el objeto');
      return;
    }

    setLoading(true);
    try {
      const device = await deviceApi.createTaggedObject(name.trim(), selectedColor);
      addDevice(device);
      setCreatedDevice(device);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || 'No se pudo crear el objeto';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!createdDevice) return;

    const qrUrl = `${BASE_URL}/q/${createdDevice.qrCode}`;
    try {
      await Share.share({
        message: `Escanea este codigo QR si encuentras mi objeto "${createdDevice.name}":\n${qrUrl}`,
        url: qrUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  // Success state - show QR code
  if (createdDevice) {
    const qrUrl = `${BASE_URL}/q/${createdDevice.qrCode}`;

    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
        <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <View style={styles.headerButton} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Objeto Creado</Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleDone}>
            <Text style={styles.doneText}>Listo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.successContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
          </View>

          <Text style={[styles.successTitle, { color: theme.text }]}>{createdDevice.name}</Text>
          <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
            Tu objeto ha sido registrado. Imprime o comparte este codigo QR y pegalo en el objeto.
          </Text>

          {/* QR Code Card */}
          <View style={[styles.qrCard, { backgroundColor: theme.surface }]}>
            <View style={styles.qrContainer}>
              <QRCode
                value={qrUrl}
                size={200}
                backgroundColor="#fff"
                color="#000"
              />
            </View>
            <Text style={[styles.qrHint, { color: theme.textSecondary }]}>
              Quien escanee este codigo podra contactarte si encuentra tu objeto
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>Compartir QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton, { backgroundColor: theme.surface, borderColor: theme.primary.main }]}
              onPress={() =>
                navigation.replace('DeviceQR', { deviceId: createdDevice.id })
              }
            >
              <Ionicons name="qr-code-outline" size={22} color={theme.primary.main} />
              <Text style={[styles.actionButtonText, { color: theme.primary.main }]}>
                Ver Opciones QR
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.15)' : '#FFF8E6' }]}>
            <Ionicons name="information-circle" size={20} color="#FF9500" />
            <Text style={[styles.infoText, { color: isDark ? '#FFB84D' : '#946C00' }]}>
              Puedes desactivar o regenerar el codigo QR en cualquier momento desde los ajustes del dispositivo.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Form state
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary.main} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Nuevo Objeto</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon Header */}
          <View style={styles.iconHeader}>
            <View
              style={[
                styles.objectIconContainer,
                { backgroundColor: selectedColor + '20' },
              ]}
            >
              <Ionicons name="pricetag-outline" size={40} color={selectedColor} />
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Registra un objeto con codigo QR para que quien lo encuentre pueda contactarte
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: theme.surface }]}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="text-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.label, { color: theme.text }]}>Nombre del objeto</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={[styles.input, {
                  borderColor: theme.border,
                  backgroundColor: isDark ? '#2C2C2E' : '#FAFAFA',
                  color: theme.text
                }]}
                placeholder="Ej: Llaves de casa, Billetera, Mochila..."
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
                maxLength={50}
                editable={!loading}
              />
              <Text style={[styles.inputHint, { color: theme.textSecondary }]}>
                Este nombre sera visible para quien escanee el codigo QR
              </Text>
            </View>

            {/* Color Picker */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="color-palette-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.label, { color: theme.text }]}>Color del objeto</Text>
              </View>
              <Text style={[styles.colorHint, { color: theme.textSecondary }]}>
                Para identificar el objeto en tu lista
              </Text>
              <View style={styles.colorPicker}>
                {OBJECT_COLORS.map((item) => (
                  <ColorDot
                    key={item.id}
                    color={item.color}
                    selected={selectedColor === item.color}
                    onPress={() => setSelectedColor(item.color)}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Preview Card */}
          <View style={[styles.previewCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.previewTitle, { color: theme.textSecondary }]}>Vista previa</Text>
            <View style={styles.previewContent}>
              <View style={[styles.objectPreview, { backgroundColor: selectedColor }]}>
                <Ionicons name="pricetag" size={24} color="#fff" />
              </View>
              <View style={styles.previewInfo}>
                <Text style={[styles.previewName, { color: theme.text }]}>
                  {name.trim() || 'Mi objeto'}
                </Text>
                <Text style={[styles.previewSubtext, { color: theme.textSecondary }]}>Tag con codigo QR</Text>
              </View>
            </View>
          </View>

          {/* Privacy Note */}
          <View style={[styles.privacyNote, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : '#E8F8ED' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#34C759" />
            <Text style={[styles.privacyText, { color: isDark ? '#5DD27A' : '#2D6A4F' }]}>
              Tus datos personales no se comparten automaticamente. Solo se compartira lo que decidas en el chat.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16, backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: selectedColor },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleAddObject}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="qr-code-outline" size={22} color="#fff" />
                <Text style={styles.addButtonText}>Crear y Generar QR</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  headerButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  objectIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  required: {
    color: '#FF3B30',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#1C1C1E',
  },
  inputHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
  },
  colorHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  objectPreview: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  previewSubtext: {
    fontSize: 13,
    color: '#8E8E93',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#E8F8ED',
    borderRadius: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#2D6A4F',
    lineHeight: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  // Success state styles
  successContent: {
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
    width: '100%',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  shareButton: {
    backgroundColor: '#34C759',
  },
  viewButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFF8E6',
    borderRadius: 12,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#946C00',
    lineHeight: 20,
  },
});
