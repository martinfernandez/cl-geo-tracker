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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceApi } from '../services/api';
import { BASE_URL, ENV } from '../config/environment';
import { useDeviceStore } from '../store/useDeviceStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Color palette for device markers
const DEVICE_COLORS = [
  { id: 'blue', color: '#007AFF', name: 'Azul' },
  { id: 'green', color: '#34C759', name: 'Verde' },
  { id: 'orange', color: '#FF9500', name: 'Naranja' },
  { id: 'red', color: '#FF3B30', name: 'Rojo' },
  { id: 'purple', color: '#AF52DE', name: 'Púrpura' },
  { id: 'pink', color: '#FF2D55', name: 'Rosa' },
  { id: 'teal', color: '#5AC8FA', name: 'Celeste' },
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
    {selected && (
      <Ionicons name="checkmark" size={18} color="#fff" />
    )}
  </TouchableOpacity>
);

export function AddDeviceScreen({ navigation }: any) {
  const [imei, setImei] = useState('');
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEVICE_COLORS[0].color);
  const [loading, setLoading] = useState(false);
  const { addDevice } = useDeviceStore();
  const insets = useSafeAreaInsets();

  const handleAddDevice = async () => {
    if (!imei.trim()) {
      Alert.alert('Error', 'Por favor ingresa el IMEI del dispositivo');
      return;
    }

    if (imei.length < 10) {
      Alert.alert('Error', 'El IMEI debe tener al menos 10 dígitos');
      return;
    }

    setLoading(true);
    try {
      const device = await deviceApi.create(
        imei.trim(),
        name.trim() || undefined,
        selectedColor
      );
      addDevice(device);
      Alert.alert('Éxito', 'Dispositivo agregado correctamente', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || 'No se pudo agregar el dispositivo';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Dispositivo</Text>
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
            <View style={[styles.deviceIconContainer, { backgroundColor: selectedColor + '20' }]}>
              <Ionicons name="hardware-chip-outline" size={40} color={selectedColor} />
            </View>
            <Text style={styles.subtitle}>
              Agrega un dispositivo GPS JX10 para rastrear tus objetos
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* IMEI Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="barcode-outline" size={18} color="#8E8E93" />
                <Text style={styles.label}>IMEI del dispositivo</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ej: 868683020097279"
                placeholderTextColor="#C7C7CC"
                value={imei}
                onChangeText={setImei}
                keyboardType="numeric"
                maxLength={15}
                editable={!loading}
              />
              <Text style={styles.inputHint}>
                Encuentra el IMEI en la etiqueta del dispositivo
              </Text>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="text-outline" size={18} color="#8E8E93" />
                <Text style={styles.label}>Nombre del dispositivo</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ej: Auto de Juan, Mochila, Bici..."
                placeholderTextColor="#C7C7CC"
                value={name}
                onChangeText={setName}
                maxLength={50}
                editable={!loading}
              />
            </View>

            {/* Color Picker */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="color-palette-outline" size={18} color="#8E8E93" />
                <Text style={styles.label}>Color del marcador</Text>
              </View>
              <Text style={styles.colorHint}>
                Este color identificará al dispositivo en el mapa
              </Text>
              <View style={styles.colorPicker}>
                {DEVICE_COLORS.map((item) => (
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
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Vista previa del marcador</Text>
            <View style={styles.previewContent}>
              <View style={[styles.markerPreview, { backgroundColor: selectedColor }]}>
                <Ionicons name="location" size={24} color="#fff" />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>
                  {name.trim() || `JX10-${imei.slice(-4) || 'XXXX'}`}
                </Text>
                <Text style={styles.previewSubtext}>Así se verá en el mapa</Text>
              </View>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.infoTitle}>Configuración del dispositivo</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="server-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                Servidor: {BASE_URL.replace('https://', '').replace('http://', '').split('/')[0]}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="git-network-outline" size={16} color="#666" />
              <Text style={styles.infoText}>Puerto: 8841</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="chatbubble-outline" size={16} color="#666" />
              <Text style={styles.infoText}>Comando SMS: IMEI#</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: selectedColor },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleAddDevice}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.addButtonText}>Agregar Dispositivo</Text>
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
  deviceIconContainer: {
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
  markerPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  infoBox: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
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
});
