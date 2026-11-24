import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, fonts } from '@/theme';

export default function NewPasswordScreen() {
  const { completePasswordRecovery, cancelPasswordRecovery } = useAuth();
  const [busy, setBusy] = useState<'save' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSavePassword() {
    if (busy) return;
    setError(null);
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
      router.replace('/');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No pudimos actualizar la contraseña.';

      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function handleCancelRecovery() {
    if (busy) return;
    setError(null);
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
            <Text style={styles.description}>
              Creá una nueva contraseña para recuperar el acceso a tu cuenta.
            </Text>

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
                editable={!busy}
              />
            </View>

            {/* Confirmación */}
            <View style={styles.confirmPasswordField}>
              <AuthTextField
                label="Confirmar contraseña"
                iconName="lock-closed-outline"
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
                editable={!busy}
                onSubmitEditing={handleSavePassword}
              />
            </View>

            {error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}

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
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.danger },

  description: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  passwordField: { width: '100%' },
  confirmPasswordField: { width: '100%' },
});
