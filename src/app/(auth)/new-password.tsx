import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
import { ActionButton } from '@/components/ui/ActionButton';
import { colors, fonts } from '@/theme';

export default function NewPasswordScreen() {
  const { completePasswordRecovery } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSavePassword() {
    if (saving) return;
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
      setSaving(true);
      await completePasswordRecovery(password);
      router.replace('/');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No pudimos actualizar la contraseña.';

      setError(message);
    } finally {
      setSaving(false);
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
          <Text style={styles.description}>
            Creá una nueva contraseña para recuperar el acceso a tu cuenta.
          </Text>

          {/* Nueva contraseña */}
          <View style={styles.passwordField}>
            <AuthTextField
              label="Nueva contraseña"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresá tu nueva contraseña"
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!saving}
            />
          </View>

          {/* Confirmación */}
          <View style={styles.confirmPasswordField}>
            <AuthTextField
              label="Confirmar contraseña"
              iconName="lock-closed-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repetí tu nueva contraseña"
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!saving}
              onSubmitEditing={handleSavePassword}
            />
          </View>

          <ActionButton
            title="Guardar contraseña"
            onPress={() => void handleSavePassword()}
            loading={saving}
          />
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
