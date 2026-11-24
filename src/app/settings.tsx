import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CitizenPage, useRewardStyles } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { brand } from '@/config/brand';
import { usePortalAction } from '@/hooks/usePortalData';
import { roleHome } from '@/models/Access';
import { useAuth } from '@/providers/AuthProvider';
import { useColors, useThemedStyles, type ThemeColors } from '@/theme';

export default function SettingsScreen() {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const { session, profile, role, guest, logout } = useAuth();
  const action = usePortalAction();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const isPortalRole =
    role === 'company_owner' || role === 'company_worker' || role === 'platform_admin';
  const backTarget = role ? (role !== 'citizen' ? roleHome(role) : '/profile') : guest ? '/profile' : '/';

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
              <Text style={s.body}>Ingresá para guardar tus entregas, tus puntos y tus canjes.</Text>
              <ActionButton title="Iniciar sesión" onPress={() => router.push('/login')} />
              <ActionButton title="Crear cuenta" secondary onPress={() => router.push('/register')} />
            </>
          )}
        </View>
        <Text accessibilityRole="header" style={s.subtitle}>
          Información legal
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/terms')}
          style={({ pressed }) => [s.card, styles.row, pressed && styles.pressed]}
        >
          <Ionicons name="document-text-outline" size={26} color={colors.primaryDark} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>Términos de uso</Text>
            <Text style={s.body}>Contrato de uso de {brand.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
        <Text accessibilityRole="header" style={s.subtitle}>
          Ayuda y colaboración
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/contact')}
          style={({ pressed }) => [s.card, styles.row, pressed && styles.pressed]}
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
        </Pressable>
        <View style={styles.about}>
          <Text style={s.label}>{brand.name}</Text>
          <Text style={s.body}>Versión {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </CitizenPage>

      <Modal
        transparent
        visible={confirmingSignOut}
        animationType="fade"
        onRequestClose={() => {
          if (!action.busy) setConfirmingSignOut(false);
        }}
      >
        <View style={styles.backdrop}>
          <View accessibilityViewIsModal style={styles.modal}>
            <Ionicons name="log-out-outline" size={32} color={colors.danger} />
            <Text accessibilityRole="header" style={s.subtitle}>
              Cerrar sesión
            </Text>
            <Text style={s.body}>¿Querés cerrar tu sesión?</Text>
            <PortalFeedback error={action.error} />
            <ActionButton
              title="Cerrar sesión"
              destructive
              loading={action.busy}
              onPress={signOut}
            />
            <ActionButton
              title="Cancelar"
              secondary
              disabled={action.busy}
              onPress={() => setConfirmingSignOut(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 84 },
    pressed: { opacity: 0.75 },
    about: { alignItems: 'center', gap: 4, paddingVertical: 16 },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modal: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      gap: 14,
    },
  });
