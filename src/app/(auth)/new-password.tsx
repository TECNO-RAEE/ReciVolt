import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputInstance,
  View,
} from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { AuthArtwork } from '@/components/ui/EcoArtwork';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { humanizePortalError } from '@/models/PortalError';
import { colors, fonts } from '@/theme';

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

function getNewPasswordErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);
  const status = getAuthErrorStatus(error);

  if (code === 'same_password') {
    return 'Elegí una contraseña distinta a la anterior.';
  }

  if (code === 'weak_password') {
    return 'Elegí una contraseña más segura, de al menos 6 caracteres.';
  }

  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Hiciste demasiados intentos. Esperá unos minutos e intentá nuevamente.';
  }

  return humanizePortalError(error, 'No pudimos actualizar la contraseña. Intentá nuevamente.');
}

export default function NewPasswordScreen() {
  const { completePasswordRecovery, cancelPasswordRecovery } = useAuth();
  const confirmPasswordRef = useRef<TextInputInstance>(null);
  const [busy, setBusy] = useState<'save' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSavePassword() {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (!password) {
      setError('Ingresá tu nueva contraseña.');
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
      setBusy('save');
      await completePasswordRecovery(password);
      setNotice('Contraseña actualizada. Ingresando a tu cuenta…');
      router.replace('/');
    } catch (err) {
      setError(getNewPasswordErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleCancelRecovery() {
    if (busy) return;
    setError(null);
    setNotice(null);
    try {
      setBusy('cancel');
      await cancelPasswordRecovery();
      router.replace('/login');
    } catch {
      setError('No pudimos cerrar la sesión de recuperación. Intentá nuevamente.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Nueva contraseña" onBack={() => void handleCancelRecovery()} />
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
              <Text style={styles.description}>
                Creá una nueva contraseña para recuperar el acceso a tu cuenta.
              </Text>
            </View>

            {/* Nueva contraseña */}
            <View style={styles.passwordField}>
              <AuthTextField
                label="Nueva contraseña"
                iconName="lock-closed-outline"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                placeholder="Ingresá tu nueva contraseña"
                passwordToggle
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                editable={!busy}
              />
              <Text style={styles.hint}>Mínimo 6 caracteres</Text>
            </View>

            {/* Confirmación */}
            <View style={styles.confirmPasswordField}>
              <AuthTextField
                label="Confirmar contraseña"
                iconName="lock-closed-outline"
                inputRef={confirmPasswordRef}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setError(null);
                }}
                placeholder="Repetí tu nueva contraseña"
                passwordToggle
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                editable={!busy}
                onSubmitEditing={() => void handleSavePassword()}
              />
            </View>

            <PortalFeedback error={error} notice={notice} />

            <ActionButton
              title="Guardar contraseña"
              onPress={() => void handleSavePassword()}
              loading={busy === 'save'}
              disabled={busy === 'cancel'}
            />
            <ActionButton
              title="Cancelar y cerrar sesión"
              secondary
              onPress={() => void handleCancelRecovery()}
              loading={busy === 'cancel'}
              disabled={busy === 'save'}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 32 },
  screen: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 18 },
  hero: { alignItems: 'center', gap: 8, marginBottom: 4 },
  description: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  passwordField: { width: '100%', gap: 6 },
  confirmPasswordField: { width: '100%' },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
