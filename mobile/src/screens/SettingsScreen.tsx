import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AreaOfInterestPicker from '../components/AreaOfInterestPicker';
import Header from '../components/Header';
import { api } from '../services/api';

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [areaOfInterest, setAreaOfInterest] = useState<{
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);

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
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveArea = async (area: { latitude: number; longitude: number; radius: number }) => {
    setLoading(true);
    try {
      await api.put('/users/area-of-interest', area);
      setAreaOfInterest(area);
      Alert.alert('Éxito', 'Área de interés actualizada');
    } catch (error: any) {
      console.error('Error saving area:', error);
      Alert.alert('Error', 'No se pudo guardar el área de interés');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Configuración" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perfil</Text>
        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Nombre</Text>
          <Text style={styles.profileValue}>{user?.name}</Text>
          <Text style={styles.profileLabel}>Email</Text>
          <Text style={styles.profileValue}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Área de Interés</Text>
        <View style={styles.card}>
          {areaOfInterest ? (
            <>
              <Text style={styles.cardText}>
                Centro: {areaOfInterest.latitude.toFixed(6)}, {areaOfInterest.longitude.toFixed(6)}
              </Text>
              <Text style={styles.cardText}>
                Radio: {(areaOfInterest.radius / 1000).toFixed(1)} km
              </Text>
            </>
          ) : (
            <Text style={styles.cardText}>No configurada</Text>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowAreaPicker(true)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {areaOfInterest ? 'Modificar Área' : 'Configurar Área'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <AreaOfInterestPicker
        visible={showAreaPicker}
        onClose={() => setShowAreaPicker(false)}
        onSave={handleSaveArea}
        initialArea={areaOfInterest || undefined}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
