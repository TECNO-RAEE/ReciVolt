import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';
import {
  pointsLabel,
  rewardCategoryFallbackImage,
  rewardEffectiveImageUrl,
  type Reward,
  type RewardCategory,
} from '@/models/Reward';
import { PointsCoin } from '@/components/ui/EcoArtwork';
import { useScrollReset } from '@/hooks/useScrollReset';

export function createRewardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background },
    content: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      padding: 20,
      gap: 16,
      paddingBottom: 32,
    },
    title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34, color: colors.text },
    subtitle: { fontFamily: fonts.semiBold, fontSize: 19, lineHeight: 27, color: colors.text },
    body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    label: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      gap: 16,
      boxShadow: '0 4px 16px rgba(22,65,39,0.05)',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    link: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primaryDark },
  });
}

export function useRewardStyles() {
  return useThemedStyles(createRewardStyles);
}

export function CitizenPage({
  title,
  children,
  back = '/home',
  action,
  footer,
}: Readonly<{
  title: string;
  children: ReactNode;
  back?: Href;
  action?: ReactNode;
  footer?: ReactNode;
}>) {
  const scroll = useScrollReset();
  const rewardStyles = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={rewardStyles.page}>
      <ScreenHeader title={title} back={back} action={action} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            rewardStyles.content,
            !footer && insets.bottom > 0 && { paddingBottom: 32 + insets.bottom },
          ]}
        >
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
export function PointsCard({
  points,
  guest = false,
  loading = false,
  error,
  onPress,
  label = 'Tus puntos',
  hint,
  showPointsUnit = false,
  compact = false,
}: Readonly<{
  points: number | null;
  guest?: boolean;
  loading?: boolean;
  error?: string | null;
  onPress?: () => void;
  label?: string;
  hint?: string;
  showPointsUnit?: boolean;
  compact?: boolean;
}>) {
  const colors = useColors();
  const rewardStyles = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const skeletonPulse = useSharedValue(1);

  useEffect(() => {
    if (!loading || reducedMotion) {
      cancelAnimation(skeletonPulse);
      skeletonPulse.set(1);
      return;
    }
    skeletonPulse.set(
      withRepeat(
        withTiming(0.55, {
          duration: motion.duration.skeletonPulse,
          easing: Easing.inOut(Easing.ease),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true
      )
    );
    return () => cancelAnimation(skeletonPulse);
  }, [loading, reducedMotion, skeletonPulse]);

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonPulse.get(),
  }));

  const accessibilityLabel = guest
    ? 'Creá tu cuenta para sumar puntos'
    : error
      ? 'No pudimos cargar tu saldo. Tocá para reintentar.'
      : onPress
        ? 'Ver mis puntos globales'
        : 'Tus puntos';
  return (
    <SpringPressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      pressScale={motion.scale.card}
      style={[styles.pointsCard, compact && styles.pointsCardCompact]}
    >
      <PointsCoin size={compact ? 56 : 80} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={rewardStyles.label}>{label}</Text>
        {loading ? (
          <Animated.View
            accessibilityLabel="Cargando saldo"
            style={[
              styles.balanceSkeleton,
              compact && styles.balanceSkeletonCompact,
              skeletonStyle,
            ]}
          />
        ) : (
          <Text
            style={[
              styles.balance,
              compact && styles.balanceCompact,
              guest && (compact ? styles.guestBalanceCompact : styles.guestBalance),
            ]}
          >
            {guest
              ? 'Empezá hoy'
              : error || points == null
                ? '—'
                : `${points.toLocaleString('es-AR')}${showPointsUnit ? ` ${points === 1 ? 'punto' : 'puntos'}` : ''}`}
          </Text>
        )}
        <Text style={styles.pointsHint} numberOfLines={compact ? 2 : undefined}>
          {guest
            ? compact
              ? 'Registrá tus entregas y canjeá premios.'
              : 'Registrá tus entregas y disfrutá premios.'
            : error
              ? 'No pudimos cargar tu saldo. Tocá para reintentar.'
              : (hint ??
                (compact
                  ? 'Sumás puntos en cada entrega confirmada.'
                  : 'Sumás puntos por tus entregas confirmadas en toda la red.'))}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} /> : null}
    </SpringPressable>
  );
}
type RewardPhotoSubject = Pick<Reward, 'imageUrl' | 'title'> & {
  category?: RewardCategory | null;
};

export function RewardPhoto({
  reward,
  height = 104,
  fallbackOnError = true,
}: Readonly<{ reward: RewardPhotoSubject; height?: number; fallbackOnError?: boolean }>) {
  const primaryUri = rewardEffectiveImageUrl(reward, true);
  const fallbackUri = fallbackOnError ? rewardCategoryFallbackImage(reward.category) : null;
  return (
    <RewardPhotoSource
      key={`photo:${primaryUri ?? ''}:${fallbackUri ?? ''}`}
      title={reward.title}
      primaryUri={primaryUri}
      fallbackUri={fallbackUri}
      height={height}
    />
  );
}

export function RewardThumbnail({
  reward,
  size = 64,
}: Readonly<{ reward: RewardPhotoSubject; size?: number }>) {
  const primaryUri = rewardEffectiveImageUrl(reward, true);
  const fallbackUri = rewardCategoryFallbackImage(reward.category);
  return (
    <RewardPhotoSource
      key={`thumb:${primaryUri ?? ''}:${fallbackUri}`}
      title={reward.title}
      primaryUri={primaryUri}
      fallbackUri={fallbackUri}
      size={size}
      compact
    />
  );
}

function RewardPhotoSource({
  title,
  primaryUri,
  fallbackUri,
  height,
  size,
  compact = false,
}: Readonly<{
  title: string;
  primaryUri: string | null;
  fallbackUri: string | null;
  height?: number;
  size?: number;
  compact?: boolean;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [activeUri, setActiveUri] = useState<string | null>(primaryUri);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(Boolean(primaryUri));

  const frameStyle = size
    ? {
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden' as const,
        backgroundColor: colors.primarySoft,
      }
    : { height, width: '100%' as const, backgroundColor: colors.primarySoft };

  if (!activeUri || failed) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={`Foto no disponible para ${title}`}
        style={[
          styles.photoFallback,
          size ? { width: size, height: size, borderRadius: size / 2 } : { height, width: '100%' },
        ]}
      >
        <Ionicons name="gift-outline" size={compact ? 26 : 36} color={colors.primaryDark} />
        {!compact && <Text style={styles.photoFallbackText}>Foto no disponible</Text>}
      </View>
    );
  }

  return (
    <View style={frameStyle}>
      <Image
        source={{ uri: activeUri }}
        style={size ? { width: size, height: size } : StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
        accessibilityLabel={title}
        onLoad={() => setLoading(false)}
        onError={() => {
          if (fallbackUri && activeUri !== fallbackUri) {
            setActiveUri(fallbackUri);
            setLoading(true);
            return;
          }
          setLoading(false);
          setFailed(true);
        }}
      />
      {!compact && loading && (
        <View
          pointerEvents="none"
          accessibilityRole="progressbar"
          accessibilityLabel={`Cargando foto de ${title}`}
          style={styles.photoLoading}
        >
          <ActivityIndicator size="small" color={colors.primaryDark} />
          <Text style={styles.photoLoadingText}>Cargando foto…</Text>
        </View>
      )}
    </View>
  );
}
export function RewardsBalance({
  points,
  loading,
  error,
  onPress,
}: Readonly<{
  points: number | null;
  loading: boolean;
  error: string | null;
  onPress?: () => void;
}>) {
  const colors = useColors();
  const rewardStyles = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const accessibilityLabel = error
    ? 'No pudimos cargar tu saldo. Tocá para reintentar.'
    : onPress
      ? 'Ver mis puntos'
      : 'Tus puntos';
  return (
    <SpringPressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      pressScale={motion.scale.card}
      style={styles.balanceCard}
    >
      <PointsCoin size={44} />
      <View style={styles.balanceText}>
        <View style={styles.balanceHeader}>
          <Text style={rewardStyles.label}>Tus puntos</Text>
          {loading ? (
            <View accessibilityLabel="Cargando saldo" style={styles.compactSkeleton} />
          ) : (
            <Text style={styles.compactBalance}>
              {error || points == null ? '—' : pointsLabel(points)}
            </Text>
          )}
        </View>
        {error ? (
          <Text style={styles.pointsHint}>No pudimos cargar tu saldo. Tocá para reintentar.</Text>
        ) : null}
      </View>
      {onPress ? (
        <View style={styles.balanceAction}>
          <Text style={styles.balanceActionText}>Movimientos</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
        </View>
      ) : null}
    </SpringPressable>
  );
}
export function PointsBadge({
  points,
  large = false,
}: Readonly<{ points: number; large?: boolean }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.badge, large && styles.badgeLarge]}>
      {large && <Ionicons name="gift-outline" size={28} color={colors.primaryDark} />}
      <Text style={[styles.badgeText, large && styles.badgeTextLarge]}>{pointsLabel(points)}</Text>
    </View>
  );
}
export function StatusBanner({
  tone,
  title,
  message,
}: Readonly<{ tone: 'pending' | 'success'; title: string; message: string }>) {
  const colors = useColors();
  const rewardStyles = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const success = tone === 'success';
  return (
    <View
      accessibilityRole="summary"
      style={[styles.banner, success ? styles.bannerSuccess : styles.bannerPending]}
    >
      <View style={[styles.bannerIcon, success && { backgroundColor: colors.primaryAction }]}>
        <Ionicons
          name={success ? 'checkmark' : 'time-outline'}
          size={28}
          color={success ? colors.textOnPrimary : colors.primaryDark}
        />
      </View>
      <View style={styles.balanceText}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={rewardStyles.body}>{message}</Text>
      </View>
    </View>
  );
}
export function InfoSection({
  icon,
  title,
  children,
}: Readonly<{
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  children: ReactNode;
}>) {
  const colors = useColors();
  const rewardStyles = useRewardStyles();
  return (
    <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 4 }}>
      <Ionicons name={icon} size={26} color={colors.text} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text accessibilityRole="header" style={rewardStyles.label}>
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}
export function DetailList({
  rows,
}: Readonly<{
  rows: { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string }[];
}>) {
  const colors = useColors();
  const rewardStyles = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.detailList}>
      {rows.map((row, i) => (
        <View key={row.label} style={[styles.detailRow, i > 0 && styles.detailDivider]}>
          <Ionicons name={row.icon} size={22} color={colors.text} />
          <Text style={[rewardStyles.label, styles.detailLabel]}>{row.label}</Text>
          <Text style={[rewardStyles.body, styles.detailValue]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}
export function CopyableCode({ code }: Readonly<{ code: string }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={styles.codePill}>
        <Text selectable style={styles.codeText}>
          {code}
        </Text>
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel="Copiar código de canje"
          pressScale={motion.scale.icon}
          style={styles.copyButton}
          onPress={() =>
            void Clipboard.setStringAsync(code)
              .then(() => {
                setCopied(true);
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => setCopied(false), 2500);
              })
              .catch(() => undefined)
          }
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={20}
            color={copied ? colors.primaryDark : colors.textSecondary}
          />
        </SpringPressable>
      </View>
      {copied && (
        <Text accessibilityLiveRegion="polite" style={styles.copied}>
          Código copiado
        </Text>
      )}
    </View>
  );
}
export function InfoNote({ children }: Readonly<{ children: ReactNode }>) {
  const colors = useColors();
  const rewardStyles = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.info}>
      <Ionicons name="information-circle-outline" size={23} color={colors.primaryDark} />
      <Text style={[rewardStyles.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pointsCard: {
      backgroundColor: colors.primarySoft,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 18,
      minHeight: 136,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1,
      borderColor: colors.cardBorderSubtle,
      boxShadow: '0 7px 20px rgba(22,65,39,0.10)',
    },
    pointsCardCompact: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 13,
      minHeight: 92,
      gap: 12,
    },
    guestBalance: { fontSize: 25, lineHeight: 32 },
    guestBalanceCompact: { fontSize: 21, lineHeight: 26 },
    balance: {
      fontFamily: fonts.bold,
      fontSize: 40,
      lineHeight: 44,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    balanceCompact: {
      fontSize: 28,
      lineHeight: 32,
    },
    balanceSkeleton: {
      width: 100,
      height: 38,
      marginVertical: 3,
      borderRadius: 8,
      backgroundColor: colors.skeletonHighlight,
    },
    balanceSkeletonCompact: {
      width: 84,
      height: 28,
      marginVertical: 2,
    },
    pointsHint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    photoLoading: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primarySoft,
    },
    photoLoadingText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
    photoFallback: {
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    photoFallbackText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerContent: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 8,
    },
    balanceCard: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.cardBorderSubtle,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    balanceText: { flex: 1, minWidth: 0, gap: 2 },
    balanceHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      gap: 8,
    },
    compactBalance: {
      fontFamily: fonts.bold,
      fontSize: 20,
      lineHeight: 26,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    compactSkeleton: {
      width: 84,
      height: 22,
      borderRadius: 6,
      backgroundColor: colors.skeletonHighlight,
    },
    balanceAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      flexShrink: 0,
    },
    balanceActionText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.primaryDark,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
    },
    badgeLarge: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
      padding: 16,
      borderRadius: 16,
    },
    badgeText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primaryDark },
    badgeTextLarge: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
    banner: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: 18,
    },
    bannerPending: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bannerSuccess: { backgroundColor: colors.primarySoft },
    bannerIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    bannerTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.text },
    detailList: { paddingHorizontal: 4 },
    detailRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 14,
    },
    detailDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    detailLabel: { width: 124, fontSize: 13 },
    detailValue: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0, color: colors.text },
    codePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 20,
      paddingRight: 4,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
    },
    codeText: {
      flexShrink: 1,
      fontFamily: fonts.bold,
      fontSize: 15,
      letterSpacing: 0.3,
      textAlign: 'center',
      color: colors.text,
    },
    copyButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    copied: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primaryDark },
    info: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
  });
