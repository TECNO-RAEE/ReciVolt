import { fonts, useThemedStyles, type ThemeColors } from '@/theme';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type QuickAccessProps = {
  title: string;
  icon: ReactNode;
  onPress: () => void;
};

export function QuickAccess({ title, icon, onPress }: Readonly<QuickAccessProps>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.quickAccess, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.quickIcon}>{icon}</View>

      <Text style={styles.quickText}>{title}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  quickAccess: {
    flex: 1,
    minHeight: 80,
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 19,
    boxShadow: '0 5px 16px rgba(22,65,39,0.08)',
  },

  quickIcon: {
    width: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    textAlign: 'center',
    color: colors.text,
  },

  pressed: {
    opacity: 0.65,
  },
});
