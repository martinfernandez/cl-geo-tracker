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
import { deviceApi } from '../services/api';
import { useDeviceStore } from '../store/useDeviceStore';

export function AddDeviceScreen({ navigation }: any) {
  const [imei, setImei] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { addDevice } = useDeviceStore();

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
      const device = await deviceApi.create(imei.trim(), name.trim() || undefined);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Agregar Dispositivo JX10</Text>

        <Text style={styles.description}>
          Ingresa el IMEI de tu dispositivo JX10. Lo puedes encontrar en la
          etiqueta del dispositivo o enviando el comando "IMEI#" por SMS.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>IMEI *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 868683020097279"
            value={imei}
            onChangeText={setImei}
            keyboardType="numeric"
            maxLength={15}
            editable={!loading}
          />

          <Text style={styles.label}>Nombre (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Mi Auto"
            value={name}
            onChangeText={setName}
            maxLength={50}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAddDevice}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Agregar Dispositivo</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Importante</Text>
          <Text style={styles.infoText}>
            • El dispositivo debe estar configurado para enviar datos al servidor
          </Text>
          <Text style={styles.infoText}>
            • Servidor: {__DEV__ ? '192.168.0.69' : 'tu-servidor.com'}
          </Text>
          <Text style={styles.infoText}>• Puerto: 8841</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    lineHeight: 20,
  },
});
