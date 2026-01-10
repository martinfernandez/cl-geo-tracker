import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserProfileType } from '../../contexts/OnboardingContext';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface ProfileOption {
  type: UserProfileType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  features: string[];
}

const profileOptions: ProfileOption[] = [
  {
    type: 'tracker',
    icon: 'location',
    title: 'Rastrear dispositivos',
    description: 'Protege lo que más te importa',
    color: '#34C759',
    features: [
      'Ubicación en tiempo real',
      'Alertas de movimiento',
      'Privacidad total de tus datos',
    ],
  },
  {
    type: 'community',
    icon: 'people',
    title: 'Comunidad vecinal',
    description: 'Conecta con tu barrio',
    color: '#5856D6',
    features: [
      'Reporta eventos cercanos',
      'Chat con vecinos',
      'Alertas de tu zona',
    ],
  },
  {
    type: 'business',
    icon: 'business',
    title: 'Gestión de flotas',
    description: 'Control total de tu operación',
    color: '#FF9500',
    features: [
      'Grupos privados',
      'Seguimiento de vehículos',
      'Reportes de actividad',
    ],
  },
  {
    type: 'explorer',
    icon: 'compass',
    title: 'Solo explorar',
    description: 'Quiero ver cómo funciona',
    color: '#8E8E93',
    features: [
      'Acceso a todas las funciones',
      'Sin configuración inicial',
      'Decide después',
    ],
  },
];

interface ProfileTypeSelectorProps {
  onSelect: (type: UserProfileType) => void;
  onSkip: () => void;
}

export function ProfileTypeSelector({ onSelect, onSkip }: ProfileTypeSelectorProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
      {/* Skip button */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + 16 }]}
        onPress={onSkip}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>Omitir</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.welcomeText, { color: theme.primary.main }]}>Bienvenido</Text>
        <Text style={[styles.title, { color: theme.text }]}>¿Cómo usarás la app?</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Personalizaremos tu experiencia según tus necesidades
        </Text>
      </View>

      {/* Options */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.optionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {profileOptions.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.optionCard,
              {
                backgroundColor: theme.surface,
                borderColor: isDark ? '#3A3A3C' : 'transparent',
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            onPress={() => onSelect(option.type)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${option.color}${isDark ? '30' : '15'}` }]}>
              <Ionicons name={option.icon} size={28} color={option.color} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>{option.title}</Text>
              <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>{option.description}</Text>
              <View style={styles.featuresContainer}>
                {option.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={14} color={option.color} />
                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Podrás cambiar esto en cualquier momento desde Configuración
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    marginRight: 2,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  featuresContainer: {
    gap: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
