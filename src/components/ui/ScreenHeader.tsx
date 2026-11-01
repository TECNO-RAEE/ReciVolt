import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';

export function ScreenHeader({
  title,
  back = '/home',
  onBack,
  action,
}: Readonly<{
  title: string;
  back?: Href;
  onBack?: () => void;
  action?: ReactNode;
}>) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <View testID="screen-header" style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(back)))}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.iconButton}>{action}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
