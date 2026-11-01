import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, fonts } from '@/theme';
import { pointsLabel, type Reward } from '@/models/Reward';
import { PointsCoin } from '@/components/ui/EcoArtwork';
import { useScrollReset } from '@/hooks/useScrollReset';

export const rewardStyles = StyleSheet.create({
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
  return (
    <View style={rewardStyles.page}>
      <ScreenHeader title={title} back={back} action={action} />
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={rewardStyles.content}
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
export function PointsCard({
  points,
  guest = false,
  loading = false,
  error,
  onPress,
}: Readonly<{
  points: number | null;
  guest?: boolean;
  loading?: boolean;
  error?: string | null;
  onPress?: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={guest ? 'Creá tu cuenta para sumar puntos' : 'Ver mis puntos globales'}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.pointsCard, pressed && { opacity: 0.75 }]}
    >
      <PointsCoin />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={rewardStyles.label}>Tus puntos</Text>
        {loading ? (
          <View accessibilityLabel="Cargando saldo" style={styles.balanceSkeleton} />
        ) : (
          <Text style={[styles.balance, guest && styles.guestBalance]}>
            {guest ? 'Empezá hoy' : error || points == null ? '—' : points.toLocaleString('es-AR')}
          </Text>
        )}
        <Text style={styles.pointsHint}>
          {guest
            ? 'Registrá tus entregas y disfrutá premios.'
            : error
              ? 'No pudimos cargar tu saldo. Tocá para reintentar.'
              : 'Sumás puntos por tus entregas confirmadas en toda la red.'}
        </Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />}
    </Pressable>
  );
}
export function RewardPhoto({
  reward,
  height = 104,
}: Readonly<{ reward: Pick<Reward, 'imageUrl' | 'title'>; height?: number }>) {
  return (
    <RewardPhotoSource key={`photo:${reward.imageUrl ?? ''}`} reward={reward} height={height} />
  );
}

function RewardPhotoSource({
  reward,
  height,
}: Readonly<{ reward: Pick<Reward, 'imageUrl' | 'title'>; height: number }>) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(Boolean(reward.imageUrl));

  if (!reward.imageUrl || failed) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={`Foto no disponible para ${reward.title}`}
        style={[styles.photoFallback, { height, width: '100%' }]}
      >
        <Ionicons name="gift-outline" size={36} color={colors.primaryDark} />
        <Text style={styles.photoFallbackText}>Foto no disponible</Text>
      </View>
    );
  }

  return (
    <View style={{ height, width: '100%', backgroundColor: colors.primarySoft }}>
      <Image
        source={{ uri: reward.imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
        accessibilityLabel={reward.title}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
      />
      {loading && (
        <View
          pointerEvents="none"
          accessibilityRole="progressbar"
          accessibilityLabel={`Cargando foto de ${reward.title}`}
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
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ver mis puntos"
      onPress={onPress}
      style={({ pressed }) => [styles.balanceCard, pressed && { opacity: 0.75 }]}
    >
      <PointsCoin size={64} />
      <View style={styles.balanceText}>
        <Text style={rewardStyles.label}>Tus puntos</Text>
        {loading ? (
          <View accessibilityLabel="Cargando saldo" style={styles.balanceSkeleton} />
        ) : (
          <Text style={styles.compactBalance}>
            {error || points == null ? '—' : pointsLabel(points)}
          </Text>
        )}
        <Text style={styles.pointsHint}>
          {error
            ? 'No pudimos cargar tu saldo. Tocá para reintentar.'
            : 'Canjeá tus puntos por beneficios en comercios adheridos.'}
        </Text>
      </View>
    </Pressable>
  );
}
export function PointsBadge({
  points,
  large = false,
}: Readonly<{ points: number; large?: boolean }>) {
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
  const success = tone === 'success';
  return (
    <View
      accessibilityRole="summary"
      style={[styles.banner, success ? styles.bannerSuccess : styles.bannerPending]}
    >
      <View style={[styles.bannerIcon, success && { backgroundColor: colors.primary }]}>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copiar código de canje"
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
        </Pressable>
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
  return (
    <View style={styles.info}>
      <Ionicons name="information-circle-outline" size={23} color={colors.primaryDark} />
      <Text style={[rewardStyles.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
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
    borderColor: '#fff',
    boxShadow: '0 7px 20px rgba(22,65,39,0.10)',
  },
  guestBalance: { fontSize: 25, lineHeight: 32 },
  balance: {
    fontFamily: fonts.bold,
    fontSize: 40,
    lineHeight: 44,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  balanceSkeleton: {
    width: 100,
    height: 38,
    marginVertical: 3,
    borderRadius: 8,
    backgroundColor: '#D6E7DB',
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
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
  },
  balanceText: { flexGrow: 1, flexShrink: 1, flexBasis: 180, minWidth: 0, gap: 2 },
  compactBalance: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    fontVariant: ['tabular-nums'],
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
