import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { AnimatedSheetModal } from '@/components/ui/AnimatedSheetModal';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { CitizenBalanceCard } from '@/components/account/CitizenBalanceCard';
import { CitizenPage, useRewardStyles } from '@/components/rewards/RewardsUI';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { usePortalAction } from '@/hooks/usePortalData';
import { useAuth } from '@/providers/AuthProvider';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';
export default function ProfileScreen() {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const { session } = useAuth();
  return session ? (
    <Profile />
  ) : (
    <CitizenPage title="Perfil">
      <View style={s.card}>
        <Text style={s.subtitle}>Comenzá a sumar impacto</Text>
        <Text style={s.body}>
          Creá tu cuenta para registrar tus entregas, sumar puntos y disfrutar premios.
        </Text>
        <ActionButton title="Crear cuenta" onPress={() => router.push('/register')} />
        <ActionButton title="Iniciar sesión" secondary onPress={() => router.push('/login')} />
      </View>
      <View style={s.card}>
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel="Mis entregas"
          onPress={() => router.push('/my-raee')}
          pressScale={motion.scale.row}
          style={styles.menuRow}
        >
          <Ionicons name="refresh-outline" size={23} color={colors.primaryDark} />
          <Text style={[s.label, { flex: 1 }]}>Mis entregas</Text>
          <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
        </SpringPressable>
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel="Qué recibimos"
          onPress={() => router.push('/device-categories')}
          pressScale={motion.scale.row}
          style={styles.menuRow}
        >
          <Ionicons name="hardware-chip-outline" size={23} color={colors.primaryDark} />
          <Text style={[s.label, { flex: 1 }]}>Qué recibimos</Text>
          <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
        </SpringPressable>
        <SettingsLink />
      </View>
    </CitizenPage>
  );
}
function SettingsLink() {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityLabel="Configuraciones"
      onPress={() => router.push('/settings')}
      pressScale={motion.scale.row}
      style={styles.menuRow}
    >
      <Ionicons name="settings-outline" size={23} color={colors.primaryDark} />
      <Text style={[s.label, { flex: 1 }]}>Configuraciones</Text>
      <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
    </SpringPressable>
  );
}
function Profile() {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const { profile, logout } = useAuth();
  const action = usePortalAction();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const menuItems = [
    {
      icon: 'refresh-outline' as const,
      label: 'Mis entregas',
      onPress: () => router.push('/my-raee'),
    },
    {
      icon: 'time-outline' as const,
      label: 'Mi actividad',
      onPress: () => router.push('/my-activity'),
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
    {
      icon: 'hardware-chip-outline' as const,
      label: 'Qué recibimos',
      onPress: () => router.push('/device-categories'),
    },
    {
      icon: 'chatbubble-outline' as const,
      label: 'Contacto',
      onPress: () => router.push('/contact'),
    },
    {
      icon: 'settings-outline' as const,
      label: 'Configuraciones',
      onPress: () => router.push('/settings'),
    },
  ];
  const signOut = () =>
    void action.run(async () => {
      await logout();
      setConfirmingSignOut(false);
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
          <SpringPressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            pressScale={motion.scale.row}
            style={[styles.menuRow, styles.menuDivider]}
          >
            <Ionicons name={icon} size={23} color={colors.primaryDark} />
            <Text style={[s.label, { flex: 1 }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
          </SpringPressable>
        ))}
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel={action.busy ? 'Cerrando sesión' : 'Cerrar sesión'}
          disabled={action.busy}
          pressScale={motion.scale.row}
          style={styles.menuRow}
          onPress={() => {
            if (Platform.OS === 'web') setConfirmingSignOut(true);
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
        </SpringPressable>
      </View>
      {!confirmingSignOut && <PortalFeedback error={action.error} />}
      <AnimatedSheetModal
        visible={confirmingSignOut}
        dismissible={!action.busy}
        presentation="dialog"
        onClose={() => {
          if (!action.busy) setConfirmingSignOut(false);
        }}
        containerStyle={styles.modal}
      >
        <Ionicons name="log-out-outline" size={32} color={colors.danger} />
        <Text accessibilityRole="header" style={s.subtitle}>
          Cerrar sesión
        </Text>
        <Text style={s.body}>¿Querés cerrar tu sesión?</Text>
        <PortalFeedback error={action.error} />
        <ActionButton
          title="Cancelar"
          disabled={action.busy}
          onPress={() => setConfirmingSignOut(false)}
        />
        <ActionButton title="Cerrar sesión" secondary loading={action.busy} onPress={signOut} />
      </AnimatedSheetModal>
    </CitizenPage>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    modal: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      gap: 14,
    },
  });
