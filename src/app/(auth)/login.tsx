import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputInstance,
  View,
} from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
import { AuthArtwork } from '@/components/ui/EcoArtwork';
import { ActionButton } from '@/components/ui/ActionButton';
import { AnimatedSheetModal } from '@/components/ui/AnimatedSheetModal';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { login } from '@/services/auth.service';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';
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
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ intent?: string; confirm?: string; email?: string }>();
  const intent = parseAuthIntent(params.intent);
  const { prepareAuth, continueAsGuest } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [authErrorVisible, setAuthErrorVisible] = useState(false);
  const passwordInputRef = useRef<TextInputInstance>(null);
  const restorePasswordFocusOnDismiss = useRef(false);
  const paramEmail = typeof params.email === 'string' ? params.email.trim() : '';
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const email = emailDraft ?? paramEmail;
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authErrorVisible || !restorePasswordFocusOnDismiss.current) return;
    const timer = setTimeout(() => {
      restorePasswordFocusOnDismiss.current = false;
      passwordInputRef.current?.focus();
    }, motion.duration.dialogOut + 20);
    return () => clearTimeout(timer);
  }, [authErrorVisible]);

  function closeAuthError(restoreFocus: boolean) {
    restorePasswordFocusOnDismiss.current = restoreFocus;
    setAuthErrorVisible(false);
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
              onChangeText={(value) => {
                setEmailDraft(value);
                setFormError(null);
              }}
              placeholder="nombre@correo.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <AuthTextField
              label="Contraseña"
              iconName="lock-closed-outline"
              inputRef={passwordInputRef}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setFormError(null);
              }}
              placeholder="Ingresá tu contraseña"
              passwordToggle
              textContentType="password"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              returnKeyType="done"
              editable={!loading}
              onSubmitEditing={() => void handleLogin()}
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

          <SpringPressable
            accessibilityRole="link"
            pressScale={motion.scale.button}
            style={styles.textLink}
            onPress={() =>
              router.push({ pathname: '/forgot-password', params: { email: email.trim() } })
            }
            disabled={loading}
          >
            <Text style={styles.textLinkLabel}>Olvidé mi contraseña</Text>
          </SpringPressable>

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

          <SpringPressable
            accessibilityRole="link"
            pressScale={motion.scale.button}
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
          </SpringPressable>
        </View>
      </ScrollView>

      <AnimatedSheetModal
        visible={authErrorVisible}
        presentation="dialog"
        onClose={() => closeAuthError(true)}
        containerStyle={styles.modalCard}
      >
        <View accessibilityRole="alert" style={styles.modalBody}>
          <View style={styles.modalIconCircle}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
          </View>
          <Text accessibilityRole="header" style={styles.modalTitle}>
            No pudimos iniciar sesión
          </Text>
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
                router.push({ pathname: '/forgot-password', params: { email: email.trim() } });
              }}
            />
          </View>
        </View>
      </AnimatedSheetModal>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    textLink: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: 8,
      alignSelf: 'center',
      justifyContent: 'center',
    },
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

    modalCard: {
      width: '100%',
      maxWidth: 380,
      padding: 24,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalBody: {
      width: '100%',
      alignItems: 'center',
    },
    modalIconCircle: {
      width: 52,
      height: 52,
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 26,
      backgroundColor: colors.dangerBackground,
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
