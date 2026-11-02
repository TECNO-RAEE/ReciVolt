import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { CitizenBalanceCard } from '@/components/account/CitizenBalanceCard';
import { CitizenPage, rewardStyles as s } from '@/components/rewards/RewardsUI';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { usePortalAction } from '@/hooks/usePortalData';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts } from '@/theme';
export default function ProfileScreen() {
  const { session } = useAuth();
  return session ? (
    <Profile />
  ) : (
    <CitizenPage title="Tu perfil">
      <View style={s.card}>
        <Text style={s.subtitle}>Comenzá a sumar impacto</Text>
        <Text style={s.body}>
          Creá tu cuenta para registrar tus entregas, sumar puntos y disfrutar premios.
        </Text>
        <ActionButton title="Crear cuenta" onPress={() => router.push('/register')} />
        <ActionButton title="Iniciar sesión" secondary onPress={() => router.push('/login')} />
      </View>
      <View style={s.card}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/my-raee')}
          style={styles.menuRow}
        >
          <Ionicons name="refresh-outline" size={23} color={colors.primaryDark} />
          <Text style={[s.label, { flex: 1 }]}>Mis entregas</Text>
          <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/device-categories')}
          style={styles.menuRow}
        >
          <Ionicons name="hardware-chip-outline" size={23} color={colors.primaryDark} />
          <Text style={[s.label, { flex: 1 }]}>Qué recibimos</Text>
          <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
        </Pressable>
        <SettingsLink />
      </View>
    </CitizenPage>
  );
}
function SettingsLink() {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/settings')}
      style={styles.menuRow}
    >
      <Ionicons name="settings-outline" size={23} color={colors.primaryDark} />
      <Text style={[s.label, { flex: 1 }]}>Configuraciones</Text>
      <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
    </Pressable>
  );
}
function Profile() {
  const { profile, logout } = useAuth();
  const action = usePortalAction();
  const menuItems = [
    {
      icon: 'refresh-outline' as const,
      label: 'Mis entregas',
      onPress: () => router.push({ pathname: '/my-activity', params: { tab: 'Entregas' } }),
    },
    {
      icon: 'gift-outline' as const,
      label: 'Mis canjes',
      onPress: () => router.push({ pathname: '/rewards', params: { tab: 'canjes' } }),
    },
    {
      icon: 'bar-chart-outline' as const,
      label: 'Mis puntos',
      onPress: () => router.push('/(app)/my-points'),
    },
    { icon: 'chatbubble-outline' as const, label: 'Contacto', onPress: () => router.push('/contact') },
  ];
  const signOut = () =>
    void action.run(async () => {
      await logout();
      router.replace('/');
    }, '');
  return (
    <CitizenPage title="Perfil">
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={38} color={colors.primaryDark} />
        </View>
        <Text style={s.title}>{profile?.fullName ?? 'Mi cuenta'}</Text>
        <Text style={s.body}>{profile?.email}</Text>
      </View>
      <CitizenBalanceCard onPress={() => router.push('/(app)/my-points')} />
      <View style={s.card}>
        {menuItems.map(({ icon, label, onPress }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={onPress}
            style={[styles.menuRow, styles.menuDivider]}
          >
            <Ionicons name={icon} size={23} color={colors.primaryDark} />
            <Text style={[s.label, { flex: 1 }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={action.busy}
          style={styles.menuRow}
          onPress={() => {
            if (Platform.OS === 'web') signOut();
            else
              Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
              ]);
          }}
        >
          <Ionicons name="log-out-outline" size={23} color={colors.danger} />
          <Text style={[styles.logoutText, { flex: 1 }]}>
            {action.busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </Text>
          <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
        </Pressable>
      </View>
      <PortalFeedback error={action.error} />
    </CitizenPage>
  );
}
const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  menuRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuDivider: { borderBottomWidth: 1, borderColor: colors.border },
  logoutText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.danger },
});
