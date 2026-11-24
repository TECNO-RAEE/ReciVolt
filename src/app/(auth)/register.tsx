import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputInstance,
  View,
} from 'react-native';

import { AuthTextField } from '@/components/auth/AuthTextField';
import { InfoNote } from '@/components/rewards/RewardsUI';
import { AuthArtwork } from '@/components/ui/EcoArtwork';
import { brand } from '@/config/brand';
import { termsUrl } from '@/config/legal';
import { ActionButton } from '@/components/ui/ActionButton';
import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';
import { register } from '@/services/auth.service';
import { authRoute, parseAuthIntent } from '@/models/AuthFlow';
import { useAuth } from '@/providers/AuthProvider';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (code === 'weak_password') {
    return 'Elegí una contraseña más segura, de al menos 6 caracteres.';
  }

  if (code === 'email_address_invalid') {
    return 'Ingresá un correo electrónico válido.';
  }

  if (code === 'validation_failed') {
    return 'Revisá el formato del correo y que la contraseña tenga al menos 6 caracteres.';
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
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ intent?: string }>();
  const intent = parseAuthIntent(params.intent);
  const registrationIntent = intent === 'invitations' ? intent : null;
  const { prepareAuth } = useAuth();
  const emailInputRef = useRef<TextInputInstance>(null);
  const passwordInputRef = useRef<TextInputInstance>(null);
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

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Ingresá tu correo electrónico.');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Ingresá un correo electrónico válido.');
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

    if (termsUrl && !acceptedTerms) {
      setError('Aceptá los Términos de uso para crear tu cuenta.');
      return;
    }

    try {
      setLoading(true);
      prepareAuth(registrationIntent);

      const { session } = await register({
        name,
        email: normalizedEmail,
        password,
        termsAcceptedAt: termsUrl ? new Date().toISOString() : null,
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
    } catch (err) {
      prepareAuth(null);
      setError(getRegisterErrorMessage(err));
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
            <Text style={styles.subtitle}>
              Unite a {brand.name} y empezá a reciclar tus electrónicos de forma simple.
            </Text>
          </View>

          <View style={styles.field}>
            <AuthTextField
              label="Nombre y apellido"
              iconName="person-outline"
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              placeholder="Ej.: Ana Pérez"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <AuthTextField
              label="Correo electrónico"
              iconName="mail-outline"
              inputRef={emailInputRef}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              placeholder="nombre@correo.com"
              keyboardType="email-address"
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
                setError(null);
              }}
              placeholder="Creá una contraseña"
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              returnKeyType="done"
              editable={!loading}
              onSubmitEditing={() => void handleRegister()}
            />
            <Text style={styles.hint}>Mínimo 6 caracteres</Text>
          </View>

          {termsUrl ? (
            <View style={styles.termsBlock}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`Acepto los Términos de uso de ${brand.name}`}
                accessibilityState={{ checked: acceptedTerms, disabled: loading }}
                disabled={loading}
                onPress={() => {
                  setAcceptedTerms((value) => !value);
                  setError(null);
                }}
                style={({ pressed }) => [styles.termsRow, pressed && styles.pressed]}
              >
                <Ionicons
                  name={acceptedTerms ? 'checkbox' : 'square-outline'}
                  size={26}
                  color={acceptedTerms ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.termsText}>Acepto los Términos de uso de {brand.name}.</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Términos de uso"
                disabled={loading}
                onPress={() => router.push('/terms')}
                style={({ pressed }) => [
                  styles.termsLinkButton,
                  pressed && styles.pressed,
                  loading && styles.disabled,
                ]}
              >
                <Text style={styles.inlineLink}>Términos de uso</Text>
              </Pressable>
            </View>
          ) : (
            <InfoNote>
              Los Términos de uso de ReciVolt se encuentran en preparación. Podrás consultarlos desde
              Configuraciones cuando estén publicados.
            </InfoNote>
          )}

          {error && (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
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
            style={({ pressed }) => [
              styles.textLink,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
            disabled={loading}
            onPress={() => router.replace(authRoute('/login', registrationIntent))}
          >
            <Text style={styles.textLinkLabel}>Ya tengo cuenta</Text>
          </Pressable>

          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => [
              styles.textLink,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
    screen: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
    hero: { alignItems: 'center', gap: 8, marginBottom: 6 },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    field: { width: '100%', gap: 6 },
    hint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    termsBlock: { gap: 4 },
    termsRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 4,
    },
    termsText: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
    },
    termsLinkButton: {
      minHeight: 44,
      alignSelf: 'flex-start',
      justifyContent: 'center',
      paddingLeft: 36,
    },
    inlineLink: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.primaryDark,
      textDecorationLine: 'underline',
    },
    textLink: { minHeight: 44, alignSelf: 'center', justifyContent: 'center' },
    textLinkLabel: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.primaryDark,
      textDecorationLine: 'underline',
    },
    pointLink: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.primaryDark,
      textDecorationLine: 'underline',
    },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.6 },
    error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.danger },
  });
