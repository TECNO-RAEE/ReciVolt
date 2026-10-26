import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

export default function NewPasswordScreen() {
  const { completePasswordRecovery } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!saving}
              trailing={
                <Pressable
                  disabled={saving}
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((value) => !value)}
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

          {/* Confirmación */}
          <View style={styles.confirmPasswordField}>
            <AuthTextField
              label="Confirmar contraseña"
              iconName="lock-closed-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repetí tu nueva contraseña"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!saving}
              onSubmitEditing={handleSavePassword}
              trailing={
                <Pressable
                  disabled={saving}
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword((value) => !value)}
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
  eyeButton: { width: 45, height: '100%', alignItems: 'center', justifyContent: 'center' },
});
