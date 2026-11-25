import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
import { AuthArtwork } from '@/components/ui/EcoArtwork';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { sendRecoveryCode, verifyRecoveryCode } from '@/services/auth.service';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;
const OTP_SLOTS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'] as const;

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

function getSendCodeErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);
  const status = getAuthErrorStatus(error);

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

  return 'No pudimos enviar el código. Intentá nuevamente.';
}

function getVerifyCodeErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);
  const status = getAuthErrorStatus(error);

  // Límite de intentos
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Hiciste demasiados intentos. Esperá unos minutos e intentá nuevamente.';
  }

  // Problemas de conexión o servidor
  if (
    (status !== undefined && status >= 500) ||
    status === 0 ||
    (error instanceof Error && error.name === 'AuthRetryableFetchError')
  ) {
    return 'No pudimos conectarnos con el servicio. Intentá de nuevo en unos minutos.';
  }

  // Código inválido o vencido
  if (
    code === 'otp_expired' ||
    code === 'token_expired' ||
    (error instanceof Error &&
      (error.message.toLowerCase().includes('expired') ||
        error.message.toLowerCase().includes('invalid')))
  ) {
    return 'El código ingresado no es válido o ya venció. Solicitá uno nuevo.';
  }

  return 'No pudimos verificar el código. Revisá el código e intentá nuevamente.';
}

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ email?: string }>();
  const paramEmail = typeof params.email === 'string' ? params.email.trim() : '';
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const email = emailDraft ?? paramEmail;
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const codeInputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleReturnToEmailStep = useCallback(() => {
    if (busy) return;
    setCodeSent(false);
    setCode('');
    setCooldown(0);
    setNotice(null);
    setError(null);
  }, [busy]);

  const screenOptions = useMemo(
    () => ({
      title: 'Recuperar contraseña',
      header: codeSent
        ? () => (
            <ScreenHeader title="Recuperar contraseña" back="/" onBack={handleReturnToEmailStep} />
          )
        : () => <ScreenHeader title="Recuperar contraseña" back="/" />,
    }),
    [codeSent, handleReturnToEmailStep]
  );

  async function handleSendCode(resend = false) {
    if (busy || (resend && cooldown > 0)) return;
    setError(null);
    setNotice(null);
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Ingresá el correo asociado a tu cuenta.');
      return;
    }

    try {
      setBusy('send');
      await sendRecoveryCode(normalizedEmail);

      setCodeSent(true);
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice(
        resend
          ? 'Código reenviado. Revisá tu correo; también la carpeta de spam.'
          : 'Código enviado. Revisá tu correo; también la carpeta de spam.'
      );
    } catch (error) {
      setError(getSendCodeErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleVerifyCode() {
    if (busy) return;
    setError(null);
    if (!codeSent) {
      setError('Primero solicitá un código de recuperación.');
      return;
    }

    if (code.length !== OTP_LENGTH) {
      setError('Ingresá los 6 dígitos del código.');
      return;
    }

    try {
      setBusy('verify');
      await verifyRecoveryCode(email, code);
      router.replace('/new-password');
    } catch (error) {
      setError(getVerifyCodeErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function handleCodeChange(value: string) {
    const onlyNumbers = value.replace(/\D/g, '').slice(0, OTP_LENGTH);

    setCode(onlyNumbers);
    setError(null);
  }

  return (
    <>
      <Stack.Screen options={screenOptions} />
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
              <AuthArtwork kind="recovery" />
              <Text accessibilityRole="header" style={styles.title}>
                {codeSent ? 'Revisá tu correo' : 'Recuperá tu contraseña'}
              </Text>
              <Text style={styles.description}>
                {codeSent
                  ? `Ingresá el código de 6 dígitos que enviamos a ${email.trim().toLowerCase()}.`
                  : 'Te enviaremos un código a tu correo electrónico para que puedas crear una nueva contraseña.'}
              </Text>
            </View>

            {!codeSent ? (
              <>
                <View style={styles.emailContainer}>
                  <AuthTextField
                    label="Correo electrónico"
                    iconName="mail-outline"
                    value={email}
                    editable={!busy}
                    onChangeText={(value) => {
                      setEmailDraft(value);
                      setNotice(null);
                      setError(null);
                    }}
                    placeholder="nombre@correo.com"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="send"
                    onSubmitEditing={() => void handleSendCode()}
                  />
                </View>
                {error && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                )}
                <ActionButton
                  title="Enviar código"
                  onPress={() => void handleSendCode()}
                  loading={busy === 'send'}
                />
              </>
            ) : (
              <>
                {notice && (
                  <Text accessibilityLiveRegion="polite" style={styles.notice}>
                    {notice}
                  </Text>
                )}
                <Pressable
                  accessible={false}
                  style={styles.otpContainer}
                  onPress={() => codeInputRef.current?.focus()}
                >
                  {OTP_SLOTS.map((slot, index) => {
                    const digit = code[index] ?? '';
                    const focused = index === code.length && code.length < OTP_LENGTH;

                    return (
                      <View
                        key={slot}
                        pointerEvents="none"
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={[styles.otpBox, focused && styles.otpBoxFocused]}
                      >
                        <Text style={styles.otpDigit}>{digit}</Text>
                      </View>
                    );
                  })}

                  <TextInput
                    ref={codeInputRef}
                    accessibilityLabel="Código de recuperación de 6 dígitos"
                    accessibilityHint="Ingresá los 6 dígitos que enviamos a tu correo"
                    editable={!busy}
                    autoFocus
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.hiddenOtpInput}
                    value={code}
                    onChangeText={handleCodeChange}
                    onSubmitEditing={() => void handleVerifyCode()}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    caretHidden
                  />
                </Pressable>
                {error && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                )}
                <ActionButton
                  title="Verificar código"
                  onPress={() => void handleVerifyCode()}
                  loading={busy === 'verify'}
                  disabled={busy === 'send' || code.length < OTP_LENGTH}
                />
                <View style={styles.row}>
                  <SpringPressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: Boolean(busy) || cooldown > 0 }}
                    disabled={Boolean(busy) || cooldown > 0}
                    pressScale={motion.scale.button}
                    style={[styles.textLink, (Boolean(busy) || cooldown > 0) && styles.disabled]}
                    onPress={() => void handleSendCode(true)}
                  >
                    <Text style={styles.textLinkLabel}>
                      {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
                    </Text>
                  </SpringPressable>
                  <SpringPressable
                    accessibilityRole="button"
                    disabled={Boolean(busy)}
                    pressScale={motion.scale.button}
                    style={[styles.textLink, busy && styles.disabled]}
                    onPress={handleReturnToEmailStep}
                  >
                    <Text style={styles.textLinkLabel}>Cambiar correo</Text>
                  </SpringPressable>
                </View>
              </>
            )}

            <SpringPressable
              accessibilityRole="link"
              pressScale={motion.scale.button}
              style={styles.textLink}
              disabled={Boolean(busy)}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.textLinkLabel}>Volver a ingresar</Text>
            </SpringPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 32 },
    screen: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
    disabled: { opacity: 0.6 },
    error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.danger },

    hero: { alignItems: 'center', gap: 8, marginBottom: 6 },
    title: {
      fontFamily: fonts.bold,
      fontSize: 26,
      lineHeight: 34,
      textAlign: 'center',
      color: colors.text,
    },
    description: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    row: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
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
    emailContainer: { width: '100%' },
    otpContainer: { width: '100%', height: 52, flexDirection: 'row', gap: 4 },
    otpBox: {
      flex: 1,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderControl,
      borderRadius: 10,
    },
    otpBoxFocused: { borderColor: colors.primary, borderWidth: 2 },
    otpDigit: { fontFamily: fonts.regular, fontSize: 18, color: colors.text },
    hiddenOtpInput: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      minHeight: 44,
      fontSize: 16,
      opacity: 0,
    },
    notice: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 21, color: colors.primary },
  });
