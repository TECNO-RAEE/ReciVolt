import { router } from 'expo-router';
import { useRef, useState } from 'react';
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
import { sendRecoveryCode, verifyRecoveryCode } from '@/services/auth.service';
import { colors, fonts } from '@/theme';

const OTP_LENGTH = 6;
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
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const codeInputRef = useRef<TextInputInstance>(null);

  async function handleSendCode(resend = false) {
    if (busy) return;
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

    if (code.length !== 6) {
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
                    setEmail(value);
                    setNotice(null);
                    setError(null);
                  }}
                  placeholder="nombre@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
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
              <Pressable style={styles.otpContainer} onPress={() => codeInputRef.current?.focus()}>
                {OTP_SLOTS.map((slot, index) => {
                  const digit = code[index] ?? '';
                  const focused = index === code.length && code.length < OTP_LENGTH;

                  return (
                    <View key={slot} style={[styles.otpBox, focused && styles.otpBoxFocused]}>
                      <Text style={styles.otpDigit}>{digit}</Text>
                    </View>
                  );
                })}

                <TextInput
                  ref={codeInputRef}
                  accessibilityLabel="Código de recuperación de 6 dígitos"
                  editable={!busy}
                  autoFocus
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
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
                disabled={busy === 'send'}
              />
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  disabled={Boolean(busy)}
                  style={[styles.textLink, busy && styles.disabled]}
                  onPress={() => void handleSendCode(true)}
                >
                  <Text style={styles.textLinkLabel}>Reenviar código</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={Boolean(busy)}
                  style={[styles.textLink, busy && styles.disabled]}
                  onPress={() => {
                    setCodeSent(false);
                    setCode('');
                    setNotice(null);
                    setError(null);
                  }}
                >
                  <Text style={styles.textLinkLabel}>Cambiar correo</Text>
                </Pressable>
              </View>
            </>
          )}

          <Pressable
            accessibilityRole="link"
            style={styles.textLink}
            disabled={Boolean(busy)}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
          >
            <Text style={styles.textLinkLabel}>Volver a ingresar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 32 },
  screen: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
  pressed: { opacity: 0.75 },
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
  textLink: { minHeight: 44, alignSelf: 'center', justifyContent: 'center' },
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
    borderColor: colors.border,
    borderRadius: 10,
  },
  otpBoxFocused: { borderColor: colors.primary },
  otpDigit: { fontFamily: fonts.regular, fontSize: 18, color: colors.text },
  hiddenOtpInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
  notice: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 21, color: colors.primary },
});
