import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { roleHome, shouldRedirectToPendingInvitations } from '@/models/Access';
import { authDestination } from '@/models/AuthFlow';
import { colors, fonts } from '@/theme';

import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
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
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>No pudimos cargar tu cuenta</Text>
          <Text style={styles.message}>{accessError}</Text>
          {logoutError && <Text style={styles.message}>{logoutError}</Text>}
          <ActionButton title="Reintentar" onPress={retryAccess} />
          <ActionButton
            title="Cerrar sesión"
            secondary
            onPress={() => {
              void logout().catch(() =>
                setLogoutError('No se pudo cerrar la sesión. Intentá nuevamente.')
              );
            }}
          />
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
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  content: { gap: 16, width: '100%', maxWidth: 420, alignSelf: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.primary },
  message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
});
