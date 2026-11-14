import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CitizenPage, makeRewardStyles } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { ThemeSetting } from '@/components/settings/ThemeSetting';
import { brand } from '@/config/brand';
import { usePortalAction } from '@/hooks/usePortalData';
import { roleHome } from '@/models/Access';
import { useAuth } from '@/providers/AuthProvider';
import { useColors, useThemedStyles } from '@/theme';

export default function SettingsScreen() {
  const colors = useColors();
  const s = useThemedStyles(makeRewardStyles);
  const { session, profile, role, logout } = useAuth();
  const action = usePortalAction();
  return (
    <CitizenPage
      title="Configuraciones"
      back={role && role !== 'citizen' ? roleHome(role) : '/profile'}
    >
      <Text style={s.subtitle}>Tu cuenta</Text>
      <View style={s.card}>
        {session ? (
          <>
            <Text style={s.label}>{profile?.fullName || 'Mi cuenta'}</Text>
            <Text style={s.body}>{profile?.email}</Text>
            <ActionButton
              title="Cerrar sesión"
              secondary
              loading={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await logout();
                  router.replace('/');
                }, '')
              }
            />
            <PortalFeedback error={action.error} />
          </>
        ) : (
          <>
            <Text style={s.label}>Estás explorando como visitante</Text>
            <Text style={s.body}>Ingresá para guardar tus entregas, tus puntos y tus canjes.</Text>
            <ActionButton title="Iniciar sesión" onPress={() => router.push('/login')} />
            <ActionButton title="Crear cuenta" secondary onPress={() => router.push('/register')} />
          </>
        )}
      </View>
      <Text style={s.subtitle}>Apariencia</Text>
      <ThemeSetting />
      <Text style={s.subtitle}>Información legal</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/terms')}
        style={[s.card, styles.row]}
      >
        <Ionicons name="document-text-outline" size={26} color={colors.primaryDark} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.label}>Términos de uso</Text>
          <Text style={s.body}>Contrato de uso de {brand.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
      <Text style={s.subtitle}>Ayuda y colaboración</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/contact')}
        style={[s.card, styles.row]}
      >
        <Ionicons name="mail-outline" size={26} color={colors.primaryDark} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.label}>Contacto</Text>
          <Text style={s.body}>Sumate como punto verde o proponé un premio</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
      <View style={styles.about}>
        <Text style={s.label}>{brand.name}</Text>
        <Text style={s.body}>Versión {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </View>
    </CitizenPage>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 84 },
  about: { alignItems: 'center', gap: 4, paddingVertical: 16 },
});
