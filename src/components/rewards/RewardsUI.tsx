import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, fonts } from '@/theme';
import type { Reward } from '@/models/Reward';
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
}: Readonly<{
  title: string;
  children: ReactNode;
  back?: Href;
  action?: ReactNode;
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
    <RewardPhotoSource
      key={`photo:${reward.imageUrl ?? ''}`}
      reward={reward}
      height={height}
    />
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
export function RewardCard({ reward, onPress }: Readonly<{ reward: Reward; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reward.title}, ${reward.businessName}, ${reward.pointsCost} puntos. Ver detalle`}
      onPress={onPress}
      style={({ pressed }) => [styles.rewardCard, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.photo}>
        <RewardPhoto reward={reward} />
        {reward.stock === 0 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>Agotado</Text>
          </View>
        )}
      </View>
      <View style={styles.rewardBody}>
        <Text style={styles.rewardTitle} numberOfLines={2}>
          {reward.title}
        </Text>
        <View style={[rewardStyles.row, { gap: 5 }]}>
          <MaterialCommunityIcons
            name="storefront-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.business} numberOfLines={1}>
            {reward.businessName}
          </Text>
        </View>
        <View style={[rewardStyles.row, { gap: 6 }]}>
          <MaterialCommunityIcons name="database-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.cost}>{reward.pointsCost.toLocaleString('es-AR')} puntos</Text>
        </View>
        <View style={styles.detailButton}>
          <Text style={styles.detailText}>Ver detalle</Text>
        </View>
      </View>
    </Pressable>
  );
}
export function RewardsSkeleton() {
  return (
    <View
      accessibilityLabel="Cargando premios"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: '48%',
            gap: 12,
            padding: 10,
            borderRadius: 16,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ height: 120, borderRadius: 10, backgroundColor: colors.primarySoft }} />
          <View style={{ height: 16, width: '80%', backgroundColor: colors.border }} />
          <View style={{ height: 14, width: '55%', backgroundColor: colors.border }} />
        </View>
      ))}
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
  rewardCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 15,
    overflow: 'hidden',
    boxShadow: '0 3px 12px rgba(22,65,39,0.06)',
  },
  photo: { margin: 6, borderRadius: 12, overflow: 'hidden' },
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
  stockBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 6,
    backgroundColor: colors.surface,
    borderRadius: 6,
  },
  stockText: { color: colors.textSecondary, fontFamily: fonts.semiBold, fontSize: 12 },
  rewardBody: { flex: 1, padding: 10, paddingTop: 3, gap: 7 },
  rewardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
  },
  business: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  cost: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  detailButton: {
    marginTop: 'auto',
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { color: colors.primaryDark, fontFamily: fonts.semiBold, fontSize: 12 },
  info: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
