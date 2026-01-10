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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PeekLogo } from '../components/PeekLogo';
import { darkTheme, radius } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showError, showWarning } = useToast();

  // Always use dark theme for login screen
  const theme = darkTheme;

  const handleLogin = async () => {
    if (!email || !password) {
      showWarning('Campos incompletos', 'Ingresa tu email y contrasena');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      let title = 'No pudimos iniciar sesion';
      let message = 'Intenta nuevamente';

      if (error.response) {
        if (error.response.status === 401) {
          title = 'Credenciales incorrectas';
          message = 'Revisa tu email y contrasena';
        } else {
          message = error.response.data?.error || `Error del servidor`;
        }
      } else if (error.request) {
        title = 'Sin conexion';
        message = 'Verifica tu conexion a internet';
      }

      showError(title, message);
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
          colors={[theme.secondary.glow, 'transparent']}
          style={[styles.orb, styles.orbCyan]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <PeekLogo size="large" showBubble={false} variant="white" />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Tu comunidad, conectada</Text>

          {/* Glass card for inputs */}
          <View style={[styles.glassCard, { backgroundColor: theme.glass.bg, borderColor: theme.glass.border }]}>
            <View style={styles.inputContainer}>
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
            </View>

            {/* Login button with gradient */}
            <TouchableOpacity
              style={[styles.buttonContainer, loading && styles.buttonDisabled]}
              onPress={handleLogin}
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
                  <Text style={styles.buttonText}>Iniciar sesion</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
            style={styles.linkContainer}
          >
            <Text style={[styles.link, { color: theme.textTertiary }]}>
              No tienes cuenta? <Text style={[styles.linkBold, { color: theme.primary.light }]}>Registrate</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
    right: -100,
    opacity: 0.6,
  },
  orbCyan: {
    bottom: -50,
    left: -100,
    opacity: 0.4,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 48,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  glassCard: {
    borderWidth: 1,
    borderRadius: radius['2xl'],
    padding: 24,
    marginBottom: 24,
  },
  inputContainer: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    fontSize: 16,
  },
  buttonContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
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
