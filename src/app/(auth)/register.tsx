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
import { AuthArtwork } from '@/components/ui/EcoArtwork';
import { brand } from '@/config/brand';
import { termsUrl } from '@/config/legal';
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (loading) return;
    setError(null);
    if (!name.trim()) {
      setError('Ingresá tu nombre y apellido.');
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

    if (!acceptedTerms) {
      setError('Aceptá los Términos de uso para crear tu cuenta.');
      return;
    }

    try {
      setLoading(true);
      prepareAuth(registrationIntent);

      const { session } = await register({
        name,
        email,
        password,
        termsAcceptedAt: new Date().toISOString(),
        termsUrl,
      });
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
          <View style={styles.hero}>
            <AuthArtwork kind="account" />
            <Text accessibilityRole="header" style={styles.title}>
              Creá tu cuenta
            </Text>
            <Text style={styles.subtitle}>
              Unite a {brand.name} y empezá a reciclar tus electrónicos de forma simple.
            </Text>
          </View>

          <View style={styles.field}>
            <AuthTextField
              label="Nombre y apellido"
              iconName="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Ej.: Ana Pérez"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
              editable={!loading}
            />
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
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!loading}
              onSubmitEditing={handleRegister}
            />
          </View>

          <View style={styles.terms}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Acepto los Términos de uso"
              accessibilityState={{ checked: acceptedTerms, disabled: loading }}
              disabled={loading}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              style={styles.checkbox}
            >
              <Ionicons
                name={acceptedTerms ? 'checkbox' : 'square-outline'}
                size={26}
                color={acceptedTerms ? colors.primary : colors.textSecondary}
              />
            </Pressable>
            <Text style={styles.termsText}>
              Acepto los{' '}
              <Text
                accessibilityRole="link"
                style={styles.inlineLink}
                onPress={() => router.push('/terms')}
              >
                Términos de uso
              </Text>{' '}
              de {brand.name}.
            </Text>
          </View>

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <ActionButton
            title="Crear cuenta"
            onPress={() => void handleRegister()}
            loading={loading}
          />

          <Pressable
            accessibilityRole="link"
            style={styles.textLink}
            disabled={loading}
            onPress={() => router.replace(authRoute('/login', registrationIntent))}
          >
            <Text style={styles.textLinkLabel}>Ya tengo cuenta</Text>
          </Pressable>

          <Pressable
            accessibilityRole="link"
            style={styles.textLink}
            disabled={loading}
            onPress={() => router.push({ pathname: '/contact', params: { topic: 'point' } })}
          >
            <Text style={styles.pointLink}>¿Querés sumarte como punto verde?</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  screen: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
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
    color: colors.textSecondary,
    textAlign: 'center',
  },
  field: { width: '100%' },
  terms: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  termsText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  inlineLink: { color: colors.primaryDark, textDecorationLine: 'underline' },
  textLink: { minHeight: 44, alignSelf: 'center', justifyContent: 'center' },
  textLinkLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },
  pointLink: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.danger },
});
