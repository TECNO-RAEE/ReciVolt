import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { PortalFeedback, PortalNav, usePortalStyles } from './PortalUI';
import { motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';
import { useScrollReset } from '@/hooks/useScrollReset';

export function AdminPage({
  title = 'Administración',
  back = '/',
  onBack,
  hideBack = false,
  sections,
  selected,
  onSelect,
  refresh,
  refreshing: refreshingProp = false,
  error,
  hasData,
  footer,
  children,
}: Readonly<{
  title?: string;
  back?: Href;
  onBack?: () => void;
  hideBack?: boolean;
  sections: readonly string[];
  selected: string;
  onSelect: (section: string) => void;
  refresh: () => Promise<void>;
  refreshing?: boolean;
  error?: string | null;
  hasData?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const scroll = useScrollReset();
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const refreshing = refreshingProp || localRefreshing;
  const reload = () => {
    if (refreshing) return;
    setLocalRefreshing(true);
    void refresh().finally(() => setLocalRefreshing(false));
  };
  return (
    <View style={styles.page}>
      <ScreenHeader
        title={title}
        back={back}
        onBack={onBack}
        hideBack={hideBack}
        action={
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Configuraciones"
            pressScale={motion.scale.icon}
            onPress={() => router.push('/settings')}
            style={styles.iconButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </SpringPressable>
        }
      />
      <View style={[styles.frame, styles.navRow]}>
        <View style={styles.nav}>
          <PortalNav items={sections} selected={selected} onSelect={onSelect} />
        </View>
        {/* The pull-to-refresh gesture does not exist with a mouse on web. */}
        {Platform.OS === 'web' && (
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar datos"
            accessibilityState={{ busy: refreshing, disabled: refreshing }}
            disabled={refreshing}
            pressScale={motion.scale.icon}
            onPress={reload}
            style={[styles.iconButton, styles.navAction]}
          >
            {refreshing ? (
              <ActivityIndicator color={colors.primary} accessibilityLabel="Actualizando datos" />
            ) : (
              <Ionicons name="refresh-outline" size={22} color={colors.primary} />
            )}
          </SpringPressable>
        )}
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          key={selected}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.content}
        >
          {error && hasData !== false && <PortalFeedback error={error} />}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
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
  const colors = useColors();
  const portalStyles = usePortalStyles();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} color={colors.textSecondary} size={44} />
      <Text style={[portalStyles.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[portalStyles.body, { textAlign: 'center' }]}>{description}</Text>
    </View>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
