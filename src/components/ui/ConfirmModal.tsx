import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { AnimatedSheetModal } from '@/components/ui/AnimatedSheetModal';
import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * Diálogo modal compartido de confirmación basado en `AnimatedSheetModal`.
 * Reemplaza `Alert.alert` en acciones destructivas o confirmaciones para funcionar
 * con la misma jerarquía y feedback en iOS, Android y Web.
 */
export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  icon = 'alert-circle-outline',
  destructive = true,
  loading = false,
  error,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <AnimatedSheetModal
      visible={visible}
      dismissible={!loading}
      presentation="dialog"
      onClose={() => {
        if (!loading) onClose();
      }}
      containerStyle={styles.card}
    >
      <Ionicons name={icon} size={34} color={destructive ? colors.danger : colors.primaryDark} />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {Boolean(error) && (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <View style={styles.actions}>
        <ActionButton
          title={confirmLabel}
          destructive={destructive}
          loading={loading}
          onPress={onConfirm}
        />
        <ActionButton title={cancelLabel} secondary disabled={loading} onPress={onClose} />
      </View>
    </AnimatedSheetModal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      gap: 14,
      alignItems: 'center',
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 19,
      lineHeight: 26,
      color: colors.text,
      textAlign: 'center',
    },
    message: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    errorBox: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerBackground,
    },
    errorText: {
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.danger,
    },
    actions: {
      width: '100%',
      gap: 10,
      marginTop: 4,
    },
  });
