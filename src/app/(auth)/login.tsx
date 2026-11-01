import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputInstance,
  View,
} from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
import { AuthArtwork } from '@/components/ui/EcoArtwork';
import { ActionButton } from '@/components/ui/ActionButton';
import { login } from '@/services/auth.service';
import { colors, fonts } from '@/theme';
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

function getLoginErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);
  const status = getAuthErrorStatus(error);

  if (code === 'email_not_confirmed') {
    return 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada y confirmá la cuenta para ingresar.';
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

  return 'No pudimos iniciar sesión. Intentá nuevamente.';
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ intent?: string; confirm?: string }>();
  const intent = parseAuthIntent(params.intent);
  const { prepareAuth, continueAsGuest } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [authErrorVisible, setAuthErrorVisible] = useState(false);
  const passwordInputRef = useRef<TextInputInstance>(null);
  const restorePasswordFocusOnDismiss = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function closeAuthError(restoreFocus: boolean) {
    setAuthErrorVisible(false);

    if (!restoreFocus) return;

    if (Platform.OS === 'android') {
      // En Android el Modal no dispara onDismiss
      requestAnimationFrame(() => passwordInputRef.current?.focus());
    } else {
      restorePasswordFocusOnDismiss.current = true;
    }
  }

  async function handleLogin() {
    if (loading) return;
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError('Ingresá tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      prepareAuth(intent);

      await login(email, password);

      router.replace('/');
    } catch (error) {
      prepareAuth(null);
      Keyboard.dismiss();
      if (getAuthErrorCode(error) === 'invalid_credentials') {
        setAuthErrorVisible(true);
      } else {
        setFormError(getLoginErrorMessage(error));
      }
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
          <View style={styles.hero}>
            <AuthArtwork kind="lock" />
            <Text accessibilityRole="header" style={styles.title}>
              Te damos la bienvenida
            </Text>
            <Text style={styles.subtitle}>
              Iniciá sesión para continuar y ser parte de una comunidad que recicla tecnología.
            </Text>
          </View>

          <View style={styles.field}>
            <AuthTextField
              label="Correo electrónico"
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <AuthTextField
              label="Contraseña"
              iconName="lock-closed-outline"
              inputRef={passwordInputRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresá tu contraseña"
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          {formError && (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
              {formError}
            </Text>
          )}

          {params.confirm === '1' && !formError && (
            <Text accessibilityLiveRegion="polite" style={styles.feedback}>
              Revisá tu correo y confirmá la cuenta. Después iniciá sesión para continuar.
            </Text>
          )}

          <ActionButton title="Ingresar" onPress={() => void handleLogin()} loading={loading} />

          <Pressable
            accessibilityRole="link"
            style={styles.textLink}
            onPress={() => router.push('/forgot-password')}
            disabled={loading}
          >
            <Text style={styles.textLinkLabel}>Olvidé mi contraseña</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <ActionButton
            title="Crear cuenta"
            secondary
            onPress={() => router.push(authRoute('/register', intent))}
            disabled={loading}
          />

          <Pressable
            accessibilityRole="link"
            style={styles.textLink}
            disabled={loading}
            onPress={() =>
              void continueAsGuest()
                .then(() => router.replace('/home'))
                .catch(() =>
                  setFormError('No pudimos continuar como visitante. Intentá nuevamente.')
                )
            }
          >
            <Text style={styles.textLinkLabel}>Seguir como visitante</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={authErrorVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          closeAuthError(true);
        }}
        onDismiss={() => {
          if (restorePasswordFocusOnDismiss.current) {
            restorePasswordFocusOnDismiss.current = false;
            passwordInputRef.current?.focus();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View accessibilityViewIsModal accessibilityRole="alert" style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIcon}>!</Text>
            </View>
            <Text style={styles.modalTitle}>No pudimos iniciar sesión</Text>
            <Text style={styles.modalMessage}>
              El correo o la contraseña no son correctos. Revisá los datos e intentá nuevamente.
            </Text>

            <View style={styles.modalActions}>
              <ActionButton title="Reintentar" onPress={() => closeAuthError(true)} />
              <ActionButton
                title="Recuperar contraseña"
                secondary
                onPress={() => {
                  closeAuthError(false);
                  router.push('/forgot-password');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 32 },
  screen: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.danger },

  hero: { alignItems: 'center', gap: 8, marginBottom: 6 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  field: { width: '100%' },
  textLink: { minHeight: 44, alignSelf: 'center', justifyContent: 'center' },
  textLinkLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  feedback: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(16, 40, 44, 0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
  },
  modalIcon: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 32,
    color: colors.primary,
  },
  modalTitle: {
    marginBottom: 10,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    color: colors.brandDark,
  },
  modalMessage: {
    marginBottom: 22,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  modalActions: { width: '100%', gap: 8 },
});
