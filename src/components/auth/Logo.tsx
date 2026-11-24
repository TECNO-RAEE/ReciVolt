import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';
import { brand } from '@/config/brand';

type Props = {
  variant?: 'dark' | 'light';
  compact?: boolean;
};

export function Logo({ variant = 'dark', compact = false }: Readonly<Props>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const light = variant === 'light';

  return (
    <View style={styles.container}>
      {!compact && <MaterialCommunityIcons name="recycle" size={34} color={colors.accent} />}

      <Text style={[styles.text, light && styles.textLight, compact && styles.compact]}>
        {brand.wordmarkPrefix}
        {brand.wordmarkSuffix && (
          <Text style={[styles.green, compact && { color: colors.primary }]}>
            {brand.wordmarkSuffix}
          </Text>
        )}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    text: {
      fontSize: 25,
      fontWeight: '800',
      color: colors.brandDark,
    },

    textLight: {
      color: colors.textOnPrimary,
    },

    green: {
      color: colors.accent,
    },
    compact: {
      fontFamily: fonts.bold,
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
    },
  });
