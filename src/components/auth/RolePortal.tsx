import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Logo } from '@/components/auth/Logo';
import { ActionButton } from '@/components/ui/ActionButton';
import { activeMemberships, canManageCompany } from '@/models/Access';
import { useAuth } from '@/providers/AuthProvider';
import { fonts, useThemedStyles, type ThemeColors } from '@/theme';

export function RolePortal({ admin = false }: Readonly<{ admin?: boolean }>) {
  const styles = useThemedStyles(makeStyles);
  const { profile, role, company, access, selectCompany, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const memberships = activeMemberships(access);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Logo />
      <Text style={styles.title}>
        {admin ? 'Administración de plataforma' : company?.companyName}
      </Text>
      <Text style={styles.description}>
        {profile?.fullName} ·{' '}
        {admin ? 'Administrador' : canManageCompany(role) ? 'Responsable de empresa' : 'Trabajador'}
      </Text>
      {!admin && memberships.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Empresa actual</Text>
          {memberships.map((membership) => (
            <ActionButton
              key={membership.id}
              title={membership.companyName}
              secondary={membership.companyId !== company?.companyId}
              onPress={() => selectCompany(membership.companyId)}
            />
          ))}
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.subtitle}>Tu acceso está listo</Text>
        <Text style={styles.description}>
          {admin
            ? 'Las solicitudes de empresas, la revisión administrativa y la auditoría estarán disponibles en las próximas etapas.'
            : 'Las operaciones y el escáner estarán disponibles cuando se habiliten las entregas.'}
        </Text>
        {!admin && canManageCompany(role) && (
          <Text style={styles.description}>
            Como responsable, podrás configurar los puntos verdes, categorías y datos de tu empresa.
          </Text>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <ActionButton
        title="Cerrar sesión"
        secondary
        onPress={() => {
          void logout().catch(() => setError('No se pudo cerrar la sesión. Intentá nuevamente.'));
        }}
      />
    </ScrollView>
  );
}
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 24,
    paddingTop: 64,
    gap: 24,
  },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.brandDark },
  subtitle: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  section: { gap: 16, paddingVertical: 24, borderTopWidth: 1, borderTopColor: colors.border },
  error: { fontFamily: fonts.regular, color: colors.danger },
});
