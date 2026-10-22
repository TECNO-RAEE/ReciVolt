import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
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
  if (
    code === 'over_request_rate_limit' ||
    status === 429
  ) {
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

  const codeInputRef = useRef<TextInput>(null);

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

      codeInputRef.current?.focus();
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
          <Text style={styles.description}>
            Ingresá el correo asociado a tu cuenta.{'\n'}
            Te enviaremos un código para recuperarla.
          </Text>

          {/* Correo */}
          <View style={styles.emailContainer}>
            <AuthTextField
              iconName="mail-outline"
              accessibilityLabel="Correo de recuperación"
              value={email}
              editable={!busy}
              onChangeText={(value) => {
                setEmail(value);
                setCodeSent(false);
                setCode('');
                setNotice(null);
                setError(null);
              }}
              placeholder="Ingresá tu correo"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Enviar código"
                  disabled={Boolean(busy)}
                  style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
                  onPress={() => void handleSendCode()}
                >
                  {busy === 'send' ? (
                    <ActivityIndicator color={colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.sendButtonText}>Enviar</Text>
                  )}
                </Pressable>
              }
            />
          </View>

          {notice && (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              {notice}
            </Text>
          )}
          <Text style={styles.codeDescription}>Ingresá el código que enviamos a tu correo.</Text>

          {/* OTP */}
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
              editable={codeSent && !busy}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              style={styles.hiddenOtpInput}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              caretHidden
            />
          </Pressable>

          <Text style={styles.didNotReceive}>¿No recibiste el código?</Text>

          <Pressable
            accessibilityRole="button"
            disabled={!codeSent || Boolean(busy)}
            style={[styles.resendButton, (!codeSent || busy) && styles.disabled]}
            onPress={() => void handleSendCode(true)}
          >
            <Text style={styles.resendText}>Reenviar código</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={Boolean(busy)}
            style={({ pressed }) => [styles.verifyButton, pressed && styles.pressed]}
            onPress={handleVerifyCode}
          >
            {busy === 'verify' ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.verifyButtonText}>Verificar Código</Text>
            )}
          </Pressable>
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 32 },
  screen: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 18 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.danger },

  description: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  emailContainer: { width: '100%' },
  sendButton: {
    width: 70,
    minHeight: 40,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  sendButtonText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textOnPrimary },
  codeDescription: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
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
  didNotReceive: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  resendButton: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center' },
  resendText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primaryDark },
  verifyButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  verifyButtonText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textOnPrimary },
  notice: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 21, color: colors.primary },
});
