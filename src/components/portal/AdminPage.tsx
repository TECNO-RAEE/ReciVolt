import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  refresh: () => Promise<void>;
  footer?: ReactNode;
  children: ReactNode;
}>) {
  const scroll = useScrollReset();
  const [refreshing, setRefreshing] = useState(false);
  const reload = () => {
    if (refreshing) return;
    setRefreshing(true);
    void refresh().finally(() => setRefreshing(false));
  };
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
      <View style={[styles.frame, styles.navRow]}>
        <View style={styles.nav}>
          <PortalNav items={sections} selected={selected} onSelect={onSelect} />
        </View>
        {/* The pull-to-refresh gesture does not exist with a mouse on web. */}
        {Platform.OS === 'web' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar datos"
            accessibilityState={{ busy: refreshing, disabled: refreshing }}
            disabled={refreshing}
            onPress={reload}
            style={({ pressed }) => [
              styles.iconButton,
              styles.navAction,
              pressed && { opacity: 0.6 },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="refresh-outline" size={22} color={colors.primary} />
            )}
          </Pressable>
        )}
      </View>
      <ScrollView
        ref={scroll}
        key={selected}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
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
  navRow: { flexDirection: 'row', alignItems: 'stretch' },
  nav: { flex: 1, minWidth: 0 },
  navAction: { borderBottomWidth: 1, borderBottomColor: colors.border },
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
