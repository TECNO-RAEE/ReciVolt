import { Modal, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { SuccessArtwork } from '@/components/ui/EcoArtwork';
import { fonts, useThemedStyles, type ThemeColors } from '@/theme';

type ScanSuccessModalProps = {
  visible: boolean;
  title: string;
  message: string;
  highlight?: string | null;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onDismiss: () => void;
};

export function ScanSuccessModal({
  visible,
  title,
  message,
  highlight,
  primaryLabel = 'Volver al inicio',
  secondaryLabel = 'Ver detalle',
  onPrimary,
  onDismiss,
}: Readonly<ScanSuccessModalProps>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal accessibilityLiveRegion="polite" style={styles.card}>
          <View style={styles.artworkWrap}>
            <SuccessArtwork />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {Boolean(highlight) && (
            <View style={styles.highlightPill}>
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          )}
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <ActionButton title={primaryLabel} onPress={onPrimary} />
            <ActionButton secondary title={secondaryLabel} onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      gap: 14,
    },
    artworkWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 22,
      lineHeight: 28,
      color: colors.text,
      textAlign: 'center',
    },
    highlightPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
    },
    highlightText: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: colors.primaryDark,
      textAlign: 'center',
    },
    message: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    actions: {
      width: '100%',
      gap: 10,
      marginTop: 6,
    },
  });
