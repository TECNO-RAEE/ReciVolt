import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ActionButton } from '@/components/ui/ActionButton';
import { AnimatedSheetModal } from '@/components/ui/AnimatedSheetModal';
import { SuccessArtwork } from '@/components/ui/EcoArtwork';
import { fonts, motion, useThemedStyles, type ThemeColors } from '@/theme';

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
  const reducedMotion = useReducedMotion();
  const artworkScale = useSharedValue(1);

  useEffect(() => {
    if (!visible || reducedMotion) {
      artworkScale.value = 1;
      return;
    }
    artworkScale.value = 0.72;
    artworkScale.value = withSpring(1, {
      ...motion.iconSpring,
      reduceMotion: ReduceMotion.System,
    });
  }, [visible, reducedMotion, artworkScale]);

  const artworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artworkScale.value }],
  }));

  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onDismiss}
      presentation="dialog"
      containerStyle={styles.card}
    >
      <View accessibilityLiveRegion="polite" style={styles.cardInner}>
        <Animated.View style={[styles.artworkWrap, artworkStyle]}>
          <SuccessArtwork />
        </Animated.View>
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
    </AnimatedSheetModal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
    },
    cardInner: {
      width: '100%',
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
