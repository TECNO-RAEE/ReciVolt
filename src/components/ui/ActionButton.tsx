import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

export function ActionButton({
  title,
  onPress,
  secondary = false,
  destructive = false,
  loading = false,
  disabled = false,
  icon,
}: Readonly<{
  title: string;
  onPress: () => void;
  secondary?: boolean;
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const spinnerColor = destructive
    ? secondary
      ? colors.danger
      : colors.textOnPrimary
    : secondary
      ? colors.primary
      : colors.textOnPrimary;

  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={loading || disabled}
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
      onPress={onPress}
      pressScale={motion.scale.button}
      style={[
        styles.button,
        icon != null && styles.withIcon,
        secondary && styles.secondary,
        destructive && (secondary ? styles.destructiveSecondary : styles.destructive),
        (loading || disabled) && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              secondary && styles.secondaryText,
              destructive && (secondary ? styles.destructiveSecondaryText : styles.destructiveText),
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </SpringPressable>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      minHeight: 50,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.primaryAction,
      alignItems: 'center',
      justifyContent: 'center',
    },
    withIcon: { flexDirection: 'row', gap: 12 },
    secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
    destructive: { backgroundColor: colors.dangerAction },
    destructiveSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    text: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: colors.textOnPrimary,
      textAlign: 'center',
    },
    secondaryText: { color: colors.primary },
    destructiveText: { color: colors.textOnPrimary },
    destructiveSecondaryText: { color: colors.danger },
    pressed: { opacity: 0.7 },
  });
