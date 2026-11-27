import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

export function ScreenHeader({
  title,
  back = '/home',
  onBack,
  hideBack = false,
  action,
}: Readonly<{
  title: string;
  back?: Href;
  onBack?: () => void;
  hideBack?: boolean;
  action?: ReactNode;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <View testID="screen-header" style={styles.header}>
        {hideBack ? (
          <View style={styles.iconButton} />
        ) : (
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            pressScale={motion.scale.icon}
            style={styles.iconButton}
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(back)))}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </SpringPressable>
        )}
        <Text accessibilityRole="header" style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.iconButton}>{action}</View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { backgroundColor: colors.background },
    header: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      minHeight: 72,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    title: {
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      fontFamily: fonts.bold,
      fontSize: 20,
      lineHeight: 26,
      color: colors.text,
      textAlign: 'center',
    },
  });
