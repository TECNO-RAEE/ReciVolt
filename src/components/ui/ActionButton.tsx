import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@/theme';

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
  const spinnerColor = destructive
    ? secondary
      ? colors.danger
      : colors.textOnPrimary
    : secondary
      ? colors.primary
      : colors.textOnPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={loading || disabled}
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        icon != null && styles.withIcon,
        secondary && styles.secondary,
        destructive && (secondary ? styles.destructiveSecondary : styles.destructive),
        (pressed || loading || disabled) && styles.pressed,
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
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withIcon: { flexDirection: 'row', gap: 12 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  destructive: { backgroundColor: colors.danger },
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
