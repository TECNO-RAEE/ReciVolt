import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
import { ActionButton } from '@/components/ui/ActionButton';
import { colors, fonts } from '@/theme';
import { register } from '@/services/auth.service';
import { authRoute, parseAuthIntent } from '@/models/AuthFlow';
import { useAuth } from '@/providers/AuthProvider';

function getAuthErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return typeof error.code === 'string' ? error.code : undefined;
  }
  return undefined;
}

function getAuthErrorStatus(error: unknown) {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return typeof error.status === 'number' ? error.status : undefined;
  }
  return undefined;
}

function getRegisterErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);
  const status = getAuthErrorStatus(error);

  if (code === 'user_already_exists') {
    return 'Ya existe una cuenta con ese correo. Iniciá sesión o recuperá tu contraseña.';
  }

  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    status === 429
  ) {
    return 'Hiciste demasiados intentos. Esperá unos minutos e intentá nuevamente.';
  }

  if (
    (status !== undefined && status >= 500) ||
    status === 0 ||
    (error instanceof Error && error.name === 'AuthRetryableFetchError')
  ) {
    return 'No pudimos conectarnos con el servicio. Intentá de nuevo en unos minutos.';
  }

  return 'No pudimos crear la cuenta. Intentá nuevamente.';
}

export default function CreateAccountScreen() {
  const params = useLocalSearchParams<{ intent?: string }>();
  const intent = parseAuthIntent(params.intent);
  const registrationIntent = intent === 'invitations' ? intent : null;
  const { prepareAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (loading) return;
    setError(null);
    if (!name.trim()) {
      setError('Ingresá tu nombre.');
      return;
    }

    if (!email.trim()) {
      setError('Ingresá tu correo electrónico.');
      return;
    }

    if (!password) {
      setError('Ingresá una contraseña.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Revisá e intentá nuevamente.');
      return;
    }

    try {
      setLoading(true);
      prepareAuth(registrationIntent);

      const { session } = await register({ name, email, password });
      if (session) {
        router.replace('/');
      } else {
        router.replace({
          ...authRoute('/login', registrationIntent),
          params: { ...(registrationIntent ? { intent: registrationIntent } : {}), confirm: '1' },
        });
      }
    } catch (error) {
      prepareAuth(null);
      setError(getRegisterErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screen}>
          <View style={styles.heading}>
            <Text style={styles.subtitle}>Reciclá tecnología, sumá puntos y disfrutá premios.</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => router.push({ pathname: '/contact', params: { topic: 'point' } })}
            style={({ pressed }) => [styles.companyLink, pressed && styles.pressed]}
          >
            <Ionicons name="location-outline" size={23} color={colors.primary} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.companyTitle}>¿Querés sumarte como punto verde?</Text>
              <Text style={styles.companyHint}>
                Sumate a cuidar el planeta. Cada punto verde hace la diferencia.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>

          {/* Nombre */}
          <View style={styles.nameField}>
            <AuthTextField
              label="Nombre"
              iconName="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Ingresá tu nombre"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Correo */}
          <View style={styles.emailField}>
            <AuthTextField
              label="Correo electrónico"
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="Ingresá tu correo"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!loading}
            />
          </View>

          {/* Contraseña */}
          <View style={styles.passwordField}>
            <AuthTextField
              label="Contraseña"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresá tu contraseña"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!loading}
              trailing={
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((value) => !value)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={25}
                    color={colors.text}
                  />
                </Pressable>
              }
            />
          </View>

          {/* Confirmar contraseña */}
          <View style={styles.confirmPasswordField}>
            <AuthTextField
              label="Confirmar contraseña"
              iconName="lock-closed-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repetí tu contraseña"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!loading}
              onSubmitEditing={handleRegister}
              trailing={
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword((value) => !value)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={25}
                    color={colors.text}
                  />
                </Pressable>
              }
            />
          </View>

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          {/* Crear cuenta */}
          <ActionButton
            title="Crear cuenta"
            onPress={() => void handleRegister()}
            loading={loading}
          />

          {/* Login */}
          <View style={styles.loginSection}>
            <Text style={styles.loginLabel}>¿Ya tenés cuenta?</Text>

            <ActionButton
              title="Iniciar sesión"
              secondary
              onPress={() => router.replace(authRoute('/login', registrationIntent))}
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  screen: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 18 },
  heading: { gap: 8, marginBottom: 6 },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  nameField: { width: '100%' },
  emailField: { width: '100%' },
  passwordField: { width: '100%' },
  confirmPasswordField: { width: '100%' },
  eyeButton: { width: 45, height: '100%', alignItems: 'center', justifyContent: 'center' },
  loginSection: { gap: 8 },
  loginLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  companyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  companyTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.primaryDark },
  companyHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.danger },
});
