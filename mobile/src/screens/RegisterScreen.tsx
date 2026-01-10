import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { usePeekMode } from '../contexts/PeekModeContext';
import { useToast } from '../contexts/ToastContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PeekLogo } from '../components/PeekLogo';
import { darkTheme, radius } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enablePeekMode, setEnablePeekMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { setPeekMode } = usePeekMode();
  const { showError, showWarning } = useToast();

  // Always use dark theme for auth screens
  const theme = darkTheme;

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      showWarning('Campos incompletos', 'Completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      showError('Las contrasenas no coinciden');
      return;
    }

    if (password.length < 6) {
      showError('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Save peek mode preference before registration
      await setPeekMode(enablePeekMode);
      await register(email, password, name);
    } catch (error: any) {
      console.error('Registration error:', error);
      let message = 'Error al registrarse';

      if (error.response) {
        message = error.response.data?.error || `Error del servidor`;
      } else if (error.request) {
        message = 'Sin conexion al servidor';
      }

      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient */}
      <LinearGradient
        colors={[theme.bg, theme.bgSecondary, theme.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative gradient orbs */}
      <View style={styles.orbContainer}>
        <LinearGradient
          colors={[theme.primary.glow, 'transparent']}
          style={[styles.orb, styles.orbPurple]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[theme.accent.glow, 'transparent']}
          style={[styles.orb, styles.orbGreen]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <PeekLogo size="large" showBubble={false} variant="white" />
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Crea tu cuenta</Text>

            {/* Glass card for inputs */}
            <View style={[styles.glassCard, { backgroundColor: theme.glass.bg, borderColor: theme.glass.border }]}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.glass.bg, borderColor: theme.glass.border, color: theme.text }]}
                  placeholder="Nombre completo"
                  placeholderTextColor={theme.textTertiary}
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                />

                <TextInput
                  style={[styles.input, { backgroundColor: theme.glass.bg, borderColor: theme.glass.border, color: theme.text }]}
                  placeholder="Email"
                  placeholderTextColor={theme.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />

                <TextInput
                  style={[styles.input, { backgroundColor: theme.glass.bg, borderColor: theme.glass.border, color: theme.text }]}
                  placeholder="Contrasena"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />

                <TextInput
                  style={[styles.input, { backgroundColor: theme.glass.bg, borderColor: theme.glass.border, color: theme.text }]}
                  placeholder="Confirmar contrasena"
                  placeholderTextColor={theme.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            </View>

            {/* Peek Mode Option */}
            <TouchableOpacity
              style={[
                styles.peekModeCard,
                { backgroundColor: theme.glass.bg, borderColor: theme.glass.border },
                enablePeekMode && { borderColor: theme.success.main, backgroundColor: theme.success.subtle }
              ]}
              onPress={() => setEnablePeekMode(!enablePeekMode)}
              activeOpacity={0.8}
            >
              <View style={styles.peekModeHeader}>
                <View style={[
                  styles.peekModeIcon,
                  { backgroundColor: enablePeekMode ? theme.success.subtle : theme.glass.bgActive }
                ]}>
                  <Ionicons
                    name={enablePeekMode ? 'eye' : 'eye-off'}
                    size={24}
                    color={enablePeekMode ? theme.success.main : theme.textTertiary}
                  />
                </View>
                <View style={styles.peekModeInfo}>
                  <View style={styles.peekModeTitleRow}>
                    <Text style={[styles.peekModeTitle, { color: theme.text }]}>Modo PeeKing</Text>
                    <View style={[
                      styles.peekModeToggle,
                      { backgroundColor: theme.glass.bgActive },
                      enablePeekMode && { backgroundColor: theme.success.main }
                    ]}>
                      <View style={[
                        styles.peekModeToggleThumb,
                        enablePeekMode && styles.peekModeToggleThumbActive
                      ]} />
                    </View>
                  </View>
                  <Text style={[styles.peekModeSubtitle, { color: theme.textSecondary }]}>
                    Ver eventos publicos cercanos en el mapa
                  </Text>
                </View>
              </View>

              <View style={[styles.peekModeExplanation, { borderTopColor: theme.glass.border }]}>
                <View style={styles.explanationItem}>
                  <Ionicons name="shield-checkmark" size={16} color={theme.success.main} />
                  <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                    Tu ubicacion nunca se comparte con otros usuarios
                  </Text>
                </View>
                <View style={styles.explanationItem}>
                  <Ionicons name="location-outline" size={16} color={theme.primary.main} />
                  <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                    Solo veras eventos en las zonas que visites
                  </Text>
                </View>
                <View style={styles.explanationItem}>
                  <Ionicons name="toggle-outline" size={16} color={theme.accent.main} />
                  <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                    Puedes activar o desactivar esto cuando quieras
                  </Text>
                </View>
              </View>

              {!enablePeekMode && (
                <View style={[styles.disabledNote, { backgroundColor: theme.glass.bgActive }]}>
                  <Ionicons name="information-circle" size={16} color={theme.textTertiary} />
                  <Text style={[styles.disabledNoteText, { color: theme.textSecondary }]}>
                    No veras eventos de la comunidad hasta que lo actives
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Register button with gradient */}
            <TouchableOpacity
              style={[styles.buttonContainer, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.primary.main, theme.primary.dark]}
                style={styles.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Crear cuenta</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login link */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={styles.linkContainer}
            >
              <Text style={[styles.link, { color: theme.textTertiary }]}>
                Ya tienes cuenta? <Text style={[styles.linkBold, { color: theme.primary.light }]}>Inicia sesion</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orbPurple: {
    top: -100,
    left: -100,
    opacity: 0.6,
  },
  orbGreen: {
    bottom: 100,
    right: -100,
    opacity: 0.4,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  glassCard: {
    borderWidth: 1,
    borderRadius: radius['2xl'],
    padding: 20,
    marginBottom: 20,
  },
  inputContainer: {
    gap: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    fontSize: 16,
  },
  peekModeCard: {
    borderWidth: 2,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 24,
  },
  peekModeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  peekModeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekModeInfo: {
    flex: 1,
  },
  peekModeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  peekModeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  peekModeToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  peekModeToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  peekModeToggleThumbActive: {
    marginLeft: 20,
  },
  peekModeSubtitle: {
    fontSize: 14,
  },
  peekModeExplanation: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  explanationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  disabledNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  disabledNoteText: {
    flex: 1,
    fontSize: 13,
  },
  buttonContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: 16,
  },
  button: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  linkContainer: {
    paddingVertical: 12,
  },
  link: {
    textAlign: 'center',
    fontSize: 15,
  },
  linkBold: {
    fontWeight: '600',
  },
});
