import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { roleHome, shouldRedirectToPendingInvitations } from '@/models/Access';
import { authDestination } from '@/models/AuthFlow';
import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';

import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const {
    session,
    role,
    access,
    loading,
    onboardingComplete,
    recoveringPassword,
    accessError,
    retryAccess,
    logout,
    invitationsPostponed,
    authIntent,
  } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    if (!recoveringPassword)
      return (
        <View style={styles.container}>
          <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando sesión" />
        </View>
      );
  }

  if (recoveringPassword && session) return <Redirect href="/new-password" />;
  if (session && accessError) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Tu cuenta" hideBack />
        <View style={styles.container}>
          <View style={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>
              No pudimos cargar tu cuenta
            </Text>
            <Text style={styles.message}>{accessError}</Text>
            {logoutError && (
              <Text accessibilityRole="alert" style={styles.error}>
                {logoutError}
              </Text>
            )}
            <ActionButton title="Reintentar" disabled={loggingOut} onPress={retryAccess} />
            <ActionButton
              title="Cerrar sesión"
              secondary
              loading={loggingOut}
              onPress={() => {
                if (loggingOut) return;
                setLogoutError(null);
                setLoggingOut(true);
                void logout()
                  .catch(() => setLogoutError('No se pudo cerrar la sesión. Intentá nuevamente.'))
                  .finally(() => setLoggingOut(false));
              }}
            />
          </View>
        </View>
      </View>
    );
  }
  if (session && role && role !== 'citizen') return <Redirect href={roleHome(role)} />;
  if (session && role === 'citizen' && authIntent)
    return <Redirect href={authDestination(authIntent)} />;
  if (
    session &&
    shouldRedirectToPendingInvitations({
      role,
      hasPendingInvitations: access?.hasPendingInvitations,
      invitationsPostponed,
    })
  )
    return <Redirect href="/company-invitations" />;
  if (session && role) return <Redirect href={roleHome(role)} />;
  return <Redirect href={onboardingComplete ? '/home' : '/onboarding'} />;
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
    content: { gap: 16, width: '100%', maxWidth: 420, alignSelf: 'center' },
    title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
    message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
    error: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.danger },
  });
