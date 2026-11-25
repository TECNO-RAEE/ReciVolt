import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import { InfoCard } from '@/components/ui/InfoCard';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';
import { useScrollReset } from '@/hooks/useScrollReset';

export function createPortalStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: colors.text },
    subtitle: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 28, color: colors.brandDark },
    body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.text },
    hint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
    label: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.text },
    heading: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 22, color: colors.text },
    section: { gap: 16, paddingVertical: 24, borderTopWidth: 1, borderTopColor: colors.border },
    row: {
      gap: 8,
      padding: 16,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
    stack: { gap: 16 },
    link: { fontFamily: fonts.semiBold, color: colors.primary, fontSize: 15 },
    error: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.danger },
  });
}

export function usePortalStyles() {
  return useThemedStyles(createPortalStyles);
}

export function PortalPage({
  title,
  subtitle,
  children,
  back,
  onBack,
  action,
  onRefresh,
  refreshing = false,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  back?: Href;
  onBack?: () => void;
  action?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}>) {
  const scroll = useScrollReset();
  const colors = useColors();
  const portalStyles = usePortalStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={title} back={back} onBack={onBack} action={action} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh && (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            )
          }
          contentContainerStyle={{
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
            paddingLeft: 24 + insets.left,
            paddingRight: 24 + insets.right,
            width: '100%',
            maxWidth: 960,
            alignSelf: 'center',
            gap: 24,
            flexGrow: 1,
          }}
        >
          {subtitle && <Text style={portalStyles.body}>{subtitle}</Text>}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
export function PortalLink({
  title,
  onPress,
  disabled = false,
}: Readonly<{ title: string; onPress: () => void; disabled?: boolean }>) {
  const portalStyles = usePortalStyles();
  return (
    <SpringPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      pressScale={motion.scale.button}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={portalStyles.link}>{title}</Text>
    </SpringPressable>
  );
}
export function PortalMenuItem({
  title,
  description,
  icon,
  onPress,
}: Readonly<{
  title: string;
  description?: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityHint={description}
      onPress={onPress}
      pressScale={motion.scale.card}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.primarySoft : colors.surface,
        minHeight: 56,
      })}
    >
      <Ionicons name={icon} size={24} color={colors.text} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={portalStyles.body}>{title}</Text>
        {description && <Text style={portalStyles.hint}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text} />
    </SpringPressable>
  );
}
export function PortalBadge({
  label,
  tone = 'success',
}: Readonly<{ label: string; tone?: 'success' | 'neutral' | 'danger' }>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor:
          tone === 'success'
            ? colors.primarySoft
            : tone === 'danger'
              ? colors.dangerBackground
              : colors.surfaceSoft,
      }}
    >
      <Text
        style={[
          portalStyles.hint,
          {
            fontFamily: fonts.semiBold,
            color:
              tone === 'success'
                ? colors.primaryDark
                : tone === 'danger'
                  ? colors.danger
                  : colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
export function PortalListItem({
  icon,
  leading,
  title,
  lines = [],
  badge,
  badgeBelow = false,
  onPress,
  accessibilityHint,
  children,
}: Readonly<{
  icon?: ComponentProps<typeof Ionicons>['name'];
  leading?: ReactNode;
  title: string;
  lines?: (string | null | undefined | false)[];
  badge?: ReactNode;
  badgeBelow?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  children?: ReactNode;
}>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  return (
    <SpringPressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={accessibilityHint}
      disabled={!onPress}
      onPress={onPress}
      pressScale={motion.scale.card}
      style={({ pressed }) => ({
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
      })}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        {leading ??
          (icon && (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primarySoft,
              }}
            >
              <Ionicons name={icon} size={26} color={colors.primaryDark} />
            </View>
          ))}
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 0, gap: 4 }}>
          <Text style={portalStyles.heading}>{title}</Text>
          {!badgeBelow && badge}
          {lines
            .filter((line): line is string => !!line)
            .map((line, i) => (
              <Text key={i} style={portalStyles.hint}>
                {line}
              </Text>
            ))}
          {badgeBelow && badge}
        </View>
        {onPress && <Ionicons name="chevron-forward" size={20} color={colors.text} />}
      </View>
      {children}
    </SpringPressable>
  );
}
export function OrganizationCard({ name, role }: Readonly<{ name: string; role: string }>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  return (
    <InfoCard
      style={{ backgroundColor: colors.surfaceSoft, padding: 20 }}
      icon={
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primarySoft,
          }}
        >
          <Ionicons name="business" size={28} color={colors.primary} />
        </View>
      }
      title={<Text style={[portalStyles.subtitle, { color: colors.text }]}>{name}</Text>}
      subtitle={role}
    />
  );
}
export function usePortalFieldStyle() {
  const colors = useColors();
  return useMemo(
    () => ({
      borderWidth: 1,
      borderColor: colors.borderControl,
      borderRadius: 8,
      backgroundColor: colors.surface,
      minHeight: 48,
      padding: 12,
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.text,
    }),
    [colors]
  );
}
export function PortalField({
  label,
  compact = false,
  suffix,
  labelStyle,
  ...props
}: TextInputProps & {
  label: string;
  compact?: boolean;
  suffix?: string;
  labelStyle?: TextInputProps['style'];
}) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  const portalFieldStyle = usePortalFieldStyle();
  const defaultAutoCapitalize =
    props.secureTextEntry || props.keyboardType === 'email-address' || props.keyboardType === 'url'
      ? 'none'
      : 'sentences';
  const input = (
    <TextInput
      accessibilityLabel={suffix ? `${label}, ${suffix}` : label}
      placeholderTextColor={colors.textSecondary}
      {...props}
      autoCapitalize={props.autoCapitalize ?? defaultAutoCapitalize}
      style={[
        portalFieldStyle,
        props.multiline && { minHeight: 90, textAlignVertical: 'top' },
        compact && {
          width: suffix ? 104 : 96,
          flexShrink: 0,
          textAlign: suffix ? 'left' : 'right',
        },
        suffix && { borderWidth: 0, borderRadius: 0 },
        props.style,
      ]}
    />
  );
  return (
    <View
      style={{
        gap: compact ? 16 : 8,
        flexDirection: compact ? 'row' : 'column',
        flexWrap: compact ? 'wrap' : undefined,
        alignItems: compact ? 'center' : undefined,
      }}
    >
      <Text
        style={[
          portalStyles.body,
          compact && { flexGrow: 1, flexShrink: 1, flexBasis: 110, minWidth: 0 },
          labelStyle,
        ]}
      >
        {label}
      </Text>
      {suffix ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            maxWidth: '100%',
            borderWidth: 1,
            borderColor: colors.borderControl,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: colors.surfaceSoft,
          }}
        >
          {input}
          <Text style={[portalStyles.hint, { paddingHorizontal: 10, flexShrink: 1 }]}>
            {suffix}
          </Text>
        </View>
      ) : (
        input
      )}
    </View>
  );
}
export function PortalSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
  disabled = false,
  hideLabel = false,
}: Readonly<{
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  compact?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
}>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  const portalFieldStyle = usePortalFieldStyle();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);
  return (
    <View
      style={{
        gap: compact ? 16 : 8,
        flexDirection: compact ? 'row' : 'column',
        alignItems: compact ? 'flex-start' : undefined,
      }}
    >
      {!hideLabel && (
        <Text style={[portalStyles.label, compact && { flex: 1, minHeight: 48, paddingTop: 14 }]}>
          {label}
        </Text>
      )}
      <View style={{ gap: 4, width: compact ? 208 : undefined }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${current?.label ?? ''}`}
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          onPress={() => setOpen(!open)}
          style={({ pressed }) => [
            portalFieldStyle,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: disabled ? 0.7 : pressed ? 0.78 : 1,
            },
          ]}
        >
          <Text style={portalStyles.body}>{current?.label}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text} />
        </Pressable>
        {open && (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.borderControl,
              borderRadius: 8,
              backgroundColor: colors.surface,
              overflow: 'hidden',
            }}
          >
            {options.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: option.value === value }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor:
                    pressed || option.value === value ? colors.primarySoft : colors.surface,
                })}
              >
                <Text style={portalStyles.body}>{option.label}</Text>
                {option.value === value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
export function PortalToggle({
  label,
  value,
  onChange,
  disabled = false,
}: Readonly<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        minHeight: 44,
        opacity: disabled ? 0.6 : pressed ? 0.78 : 1,
      })}
    >
      <Text style={[portalStyles.body, { flex: 1, minWidth: 0 }]}>{label}</Text>
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ false: colors.borderControl, true: colors.primaryAction }}
          accessible={false}
        />
      </View>
    </Pressable>
  );
}
export function PortalChoice({
  label,
  selected,
  onPress,
  disabled = false,
  role = 'checkbox',
}: Readonly<{
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  role?: 'checkbox' | 'radio' | 'button';
}>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  const iconName =
    role === 'radio'
      ? selected
        ? 'radio-button-on'
        : 'radio-button-off'
      : role === 'button'
        ? selected
          ? 'checkmark-circle'
          : 'chevron-forward'
        : selected
          ? 'checkbox'
          : 'square-outline';
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={
        role === 'button' ? { selected, disabled } : { checked: selected, disabled }
      }
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        minHeight: 44,
        opacity: disabled ? 0.6 : pressed ? 0.72 : 1,
      })}
    >
      <Ionicons
        name={iconName}
        size={24}
        color={selected ? colors.primary : colors.textSecondary}
      />
      <Text style={[portalStyles.body, { flex: 1, minWidth: 0 }]}>{label}</Text>
    </Pressable>
  );
}
export function PortalFeedback({
  error,
  notice,
}: Readonly<{ error?: string | null; notice?: string | null }>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  return (
    <>
      {Boolean(error) && (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.dangerBackground,
          }}
        >
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={[portalStyles.error, { flex: 1, minWidth: 0 }]}>{error}</Text>
        </View>
      )}
      {Boolean(notice) && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.primarySoft,
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.primaryDark} />
          <Text style={[portalStyles.body, { flex: 1, minWidth: 0, color: colors.primaryDark }]}>
            {notice}
          </Text>
        </View>
      )}
    </>
  );
}
export function PortalLoading({
  loading,
  error,
  retry,
}: Readonly<{ loading: boolean; error: string | null; retry: () => void }>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  return (
    <>
      {loading && <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando datos" />}
      {error && (
        <View style={portalStyles.stack}>
          <PortalFeedback error={error} />
          <ActionButton secondary title="Reintentar" onPress={retry} />
        </View>
      )}
    </>
  );
}
export function PortalNav({
  items,
  selected,
  onSelect,
}: Readonly<{ items: readonly string[]; selected: string; onSelect: (item: string) => void }>) {
  const colors = useColors();
  const portalStyles = usePortalStyles();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const positions = useRef<Record<string, number>>({});
  useEffect(() => {
    scroll.current?.scrollTo({
      x: Math.max(0, (positions.current[selected] ?? 0) - 24),
      animated: false,
    });
  }, [selected]);
  return (
    <ScrollView
      ref={scroll}
      onLayout={() =>
        scroll.current?.scrollTo({
          x: Math.max(0, (positions.current[selected] ?? 0) - 24),
          animated: false,
        })
      }
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ flexGrow: 1 }}
      accessibilityRole="tablist"
    >
      <View
        style={{
          flexDirection: 'row',
          flexGrow: 1,
          gap: 24,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {items.map((item) => (
          <Pressable
            key={item}
            onLayout={(event) => {
              positions.current[item] = event.nativeEvent.layout.x;
              if (item === selected)
                scroll.current?.scrollTo({
                  x: Math.max(0, event.nativeEvent.layout.x - 24),
                  animated: false,
                });
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: item === selected }}
            onPress={() => onSelect(item)}
            style={({ pressed }) => ({
              minHeight: 48,
              justifyContent: 'center',
              borderBottomWidth: item === selected ? 2 : 0,
              borderBottomColor: colors.primary,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={[
                portalStyles.link,
                { color: item === selected ? colors.primary : colors.brandDark },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
