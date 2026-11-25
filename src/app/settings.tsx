import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { CitizenPage, useRewardStyles } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { AnimatedSheetModal } from '@/components/ui/AnimatedSheetModal';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { brand } from '@/config/brand';
import { usePortalAction } from '@/hooks/usePortalData';
import { roleHome } from '@/models/Access';
import { useAuth } from '@/providers/AuthProvider';
import {
  fonts,
  motion,
  useColors,
  useThemePreference,
  useThemedStyles,
  type ThemeColors,
  type ThemePreference,
} from '@/theme';

const APPEARANCE_OPTIONS: readonly {
  value: ThemePreference;
  label: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    value: 'system',
    label: 'Automático',
    description: 'Sigue la apariencia del dispositivo',
    icon: 'phone-portrait-outline',
  },
  {
    value: 'light',
    label: 'Claro',
    description: 'Fondo claro en toda la aplicación',
    icon: 'sunny-outline',
  },
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'Reduce el brillo con contraste adaptado',
    icon: 'moon-outline',
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const { preference, setPreference } = useThemePreference();
  const { session, profile, role, guest, logout } = useAuth();
  const action = usePortalAction();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const isPortalRole =
    role === 'company_owner' || role === 'company_worker' || role === 'platform_admin';
  const backTarget = role
    ? role !== 'citizen'
      ? roleHome(role)
      : '/profile'
    : guest
      ? '/profile'
      : '/';

  const signOut = () =>
    void action.run(async () => {
      try {
        await logout();
      } catch {
        throw new Error('No pudimos cerrar la sesión. Intentá nuevamente.');
      }
      setConfirmingSignOut(false);
      router.replace('/');
    }, '');

  return (
    <>
      <CitizenPage title="Configuraciones" back={backTarget}>
        <Text accessibilityRole="header" style={s.subtitle}>
          Tu cuenta
        </Text>
        <View style={s.card}>
          {session ? (
            <>
              <Text style={s.label}>{profile?.fullName || 'Mi cuenta'}</Text>
              {profile?.email ? <Text style={s.body}>{profile.email}</Text> : null}
              <ActionButton
                title="Cerrar sesión"
                secondary
                destructive
                loading={action.busy}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    setConfirmingSignOut(true);
                  } else {
                    Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
                    ]);
                  }
                }}
              />
              {!confirmingSignOut && <PortalFeedback error={action.error} />}
            </>
          ) : (
            <>
              <Text style={s.label}>Estás explorando como visitante</Text>
              <Text style={s.body}>
                Ingresá para guardar tus entregas, tus puntos y tus canjes.
              </Text>
              <ActionButton title="Iniciar sesión" onPress={() => router.push('/login')} />
              <ActionButton
                title="Crear cuenta"
                secondary
                onPress={() => router.push('/register')}
              />
            </>
          )}
        </View>
        <Text accessibilityRole="header" style={s.subtitle}>
          Apariencia
        </Text>
        <View style={s.card}>
          <Text style={s.body}>
            Elegí el tema visual o seguí la configuración de tu dispositivo.
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Apariencia"
            style={styles.optionList}
          >
            {APPEARANCE_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <SpringPressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  accessibilityLabel={`${option.label}. ${option.description}`}
                  onPress={() => setPreference(option.value)}
                  pressScale={motion.scale.row}
                  style={[styles.appearanceOption, selected && styles.appearanceOptionSelected]}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? colors.primaryDark : colors.textSecondary}
                  />
                  <View style={styles.appearanceText}>
                    <Text
                      style={[styles.appearanceLabel, selected && { color: colors.primaryDark }]}
                    >
                      {option.label}
                    </Text>
                    <Text style={s.body}>{option.description}</Text>
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={selected ? colors.primary : colors.borderControl}
                  />
                </SpringPressable>
              );
            })}
          </View>
        </View>
        <Text accessibilityRole="header" style={s.subtitle}>
          Información legal
        </Text>
        <SpringPressable
          accessibilityRole="button"
          onPress={() => router.push('/terms')}
          pressScale={motion.scale.card}
          style={[s.card, styles.row]}
        >
          <Ionicons name="document-text-outline" size={26} color={colors.primaryDark} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>Términos de uso</Text>
            <Text style={s.body}>Contrato de uso de {brand.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </SpringPressable>
        <Text accessibilityRole="header" style={s.subtitle}>
          Ayuda y colaboración
        </Text>
        <SpringPressable
          accessibilityRole="button"
          onPress={() => router.push('/contact')}
          pressScale={motion.scale.card}
          style={[s.card, styles.row]}
        >
          <Ionicons name="mail-outline" size={26} color={colors.primaryDark} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>Contacto</Text>
            <Text style={s.body}>
              {isPortalRole
                ? 'Escribinos por soporte o consultas'
                : 'Sumate como punto verde o proponé un premio'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </SpringPressable>
        <View style={styles.about}>
          <Text style={s.label}>{brand.name}</Text>
          <Text style={s.body}>Versión {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </CitizenPage>

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
        <ActionButton title="Cerrar sesión" destructive loading={action.busy} onPress={signOut} />
        <ActionButton
          title="Cancelar"
          secondary
          disabled={action.busy}
          onPress={() => setConfirmingSignOut(false)}
        />
      </AnimatedSheetModal>
    </>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 84 },
    about: { alignItems: 'center', gap: 4, paddingVertical: 16 },
    optionList: { gap: 10 },
    appearanceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
    },
    appearanceOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    appearanceText: { flex: 1, minWidth: 0, gap: 2 },
    appearanceLabel: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
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
