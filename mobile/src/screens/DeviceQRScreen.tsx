import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceApi, DeviceQRInfo } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { BASE_URL } from '../config/environment';

export function DeviceQRScreen({ navigation, route }: any) {
  const { deviceId } = route.params;
  const [device, setDevice] = useState<DeviceQRInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const insets = useSafeAreaInsets();

  const loadDevice = async () => {
    try {
      const data = await deviceApi.getQR(deviceId);
      setDevice(data);
    } catch (error: any) {
      console.error('Error loading device QR:', error);
      Alert.alert('Error', 'No se pudo cargar la informacion del dispositivo');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevice();
  }, [deviceId]);

  const handleToggleQR = async () => {
    if (!device) return;

    setToggling(true);
    try {
      const updated = await deviceApi.toggleQR(deviceId, !device.qrEnabled);
      setDevice(updated);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cambiar el estado del QR');
    } finally {
      setToggling(false);
    }
  };

  const handleRegenerateQR = () => {
    Alert.alert(
      'Regenerar Codigo QR',
      'El codigo QR actual dejara de funcionar y se generara uno nuevo. Los QR impresos dejaran de servir. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Regenerar',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            try {
              const updated = await deviceApi.regenerateQR(deviceId);
              setDevice(updated);
              Alert.alert('Listo', 'El codigo QR ha sido regenerado');
            } catch (error) {
              Alert.alert('Error', 'No se pudo regenerar el codigo QR');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!device) return;

    const qrUrl = `${BASE_URL}/q/${device.qrCode}`;
    try {
      await Share.share({
        message: `Escanea este codigo QR si encuentras mi objeto "${device.name}":\n${qrUrl}`,
        url: qrUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Codigo QR</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  if (!device) return null;

  const qrUrl = `${BASE_URL}/q/${device.qrCode}`;
  const isTaggedObject = device.type === 'TAGGED_OBJECT';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Codigo QR</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Device Info */}
        <View style={styles.deviceInfo}>
          <View style={styles.deviceIcon}>
            <Ionicons
              name={isTaggedObject ? 'pricetag' : 'hardware-chip'}
              size={28}
              color="#007AFF"
            />
          </View>
          <View>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceType}>
              {isTaggedObject ? 'Tag' : 'Dispositivo GPS'}
            </Text>
          </View>
        </View>

        {/* QR Code Card */}
        <View style={[styles.qrCard, !device.qrEnabled && styles.qrCardDisabled]}>
          {device.qrEnabled ? (
            <>
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrUrl}
                  size={220}
                  backgroundColor="#fff"
                  color="#000"
                />
              </View>
              <Text style={styles.qrHint}>
                Escanea este codigo para contactar al dueno
              </Text>
            </>
          ) : (
            <View style={styles.disabledOverlay}>
              <Ionicons name="eye-off" size={48} color="#8E8E93" />
              <Text style={styles.disabledText}>Codigo QR desactivado</Text>
              <Text style={styles.disabledHint}>
                Activa el codigo para que otros puedan contactarte
              </Text>
            </View>
          )}
        </View>

        {/* Toggle Section */}
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name={device.qrEnabled ? 'eye' : 'eye-off'}
                size={24}
                color={device.qrEnabled ? '#34C759' : '#8E8E93'}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Codigo QR activo</Text>
                <Text style={styles.settingDescription}>
                  {device.qrEnabled
                    ? 'Otros pueden escanear y contactarte'
                    : 'El codigo QR no funciona actualmente'}
                </Text>
              </View>
            </View>
            {toggling ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Switch
                value={device.qrEnabled}
                onValueChange={handleToggleQR}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                ios_backgroundColor="#E5E5EA"
              />
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShare}
            disabled={!device.qrEnabled}
          >
            <Ionicons name="share-outline" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Compartir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.regenerateButton]}
            onPress={handleRegenerateQR}
            disabled={regenerating}
          >
            {regenerating ? (
              <ActivityIndicator size="small" color="#FF9500" />
            ) : (
              <>
                <Ionicons name="refresh" size={22} color="#FF9500" />
                <Text style={[styles.actionButtonText, { color: '#FF9500' }]}>
                  Regenerar
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Como funciona</Text>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletText}>1</Text>
            </View>
            <Text style={styles.infoItemText}>
              Imprime o pega este codigo QR en tu objeto
            </Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletText}>2</Text>
            </View>
            <Text style={styles.infoItemText}>
              Quien lo encuentre puede escanear el codigo
            </Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletText}>3</Text>
            </View>
            <Text style={styles.infoItemText}>
              Se abrira un chat anonimo para coordinarse
            </Text>
          </View>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark" size={20} color="#34C759" />
          <Text style={styles.privacyText}>
            Tu informacion personal nunca se comparte automaticamente. Solo compartes lo que decides en el chat.
          </Text>
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  deviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 14,
    color: '#8E8E93',
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
    marginBottom: 20,
  },
  qrCardDisabled: {
    opacity: 0.7,
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
  },
  disabledOverlay: {
    alignItems: 'center',
    padding: 40,
  },
  disabledText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
  },
  disabledHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#007AFF',
  },
  regenerateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  infoBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBulletText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  infoItemText: {
    flex: 1,
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
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
});
