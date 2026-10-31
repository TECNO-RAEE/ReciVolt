import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PortalNav, portalStyles } from './PortalUI';
import { colors } from '@/theme';
import { useScrollReset } from '@/hooks/useScrollReset';

export function AdminPage({
  title = 'Administración',
  back = '/',
  sections,
  selected,
  onSelect,
  refresh,
  footer,
  children,
}: Readonly<{
  title?: string;
  back?: Href;
  sections: readonly string[];
  selected: string;
  onSelect: (section: string) => void;
  refresh: () => void;
  footer?: ReactNode;
  children: ReactNode;
}>) {
  const scroll = useScrollReset();
  return (
    <View style={styles.page}>
      <ScreenHeader
        title={title}
        back={back}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Configuraciones"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </Pressable>
        }
      />
      <View style={styles.frame}>
        <PortalNav items={sections} selected={selected} onSelect={onSelect} />
      </View>
      <ScrollView
        ref={scroll}
        key={selected}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
      {footer && (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.footer}>
          <View style={styles.footerContent}>{footer}</View>
        </SafeAreaView>
      )}
    </View>
  );
}

export function AdminEmpty({
  title,
  description,
  icon = 'checkmark-circle-outline',
}: Readonly<{
  title: string;
  description: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
}>) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} color={colors.textSecondary} size={44} />
      <Text style={[portalStyles.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[portalStyles.body, { textAlign: 'center' }]}>{description}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  frame: { width: '100%', maxWidth: 960, alignSelf: 'center', paddingHorizontal: 16 },
  iconButton: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  footer: { backgroundColor: colors.background },
  footerContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  empty: { gap: 12, paddingVertical: 24, alignItems: 'center' },
});
